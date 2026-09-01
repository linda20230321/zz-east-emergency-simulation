import type { AgentPoint, Point } from "@/lib/agent-density"
import type { RegionState } from "@/lib/simulation"

type ExitDirection = "正南" | "正北" | "西南" | "西北"

type GraphNode = Point & { id: string }

type GraphEdge = {
  from: string
  to: string
  lane: ExitDirection
}

export type DynamicRoute = {
  id: string
  name: string
  exit: ExitDirection
  color: string
  points: Point[]
  distanceMeters: number
  density: number
  estimatedMinutes: number
  score: number
  recommended: boolean
  reason: string
}

const routeMeta: Array<{ id: string; name: string; exit: ExitDirection; via: string; color: string }> = [
  { id: "EVAC_SW", name: "西南通道疏散线", exit: "西南", via: "EXIT_SW", color: "#39d9ff" },
  { id: "EVAC_S", name: "正南通道疏散线", exit: "正南", via: "EXIT_S", color: "#45e0a8" },
  { id: "EVAC_N", name: "正北通道疏散线", exit: "正北", via: "EXIT_N", color: "#ffbd55" },
  { id: "EVAC_NW", name: "西北通道疏散线", exit: "西北", via: "EXIT_NW", color: "#b58cff" },
]

const nodes: GraphNode[] = [
  { id: "HALL_CORE", x: 52, y: 21 },
  { id: "HALL_WEST", x: 36, y: 23 },
  { id: "HALL_EAST", x: 64, y: 20 },
  { id: "EXIT_SW", x: 20, y: 29 },
  { id: "EXIT_S", x: 50, y: 31 },
  { id: "EXIT_N", x: 70, y: 14 },
  { id: "EXIT_NW", x: 19, y: 18 },
  { id: "L2_SW", x: 24, y: 47 },
  { id: "L2_S", x: 49, y: 50 },
  { id: "L2_N", x: 66, y: 42 },
  { id: "L2_NW", x: 31, y: 42 },
  { id: "L1_SW", x: 24, y: 70 },
  { id: "L1_S", x: 42, y: 72 },
  { id: "L1_N", x: 39, y: 67 },
  { id: "L1_NW", x: 28, y: 68 },
  { id: "WEST_PLAZA", x: 31, y: 76 },
]

const edges: GraphEdge[] = [
  { from: "HALL_CORE", to: "HALL_WEST", lane: "西南" },
  { from: "HALL_WEST", to: "EXIT_SW", lane: "西南" },
  { from: "EXIT_SW", to: "L2_SW", lane: "西南" },
  { from: "L2_SW", to: "L1_SW", lane: "西南" },
  { from: "L1_SW", to: "WEST_PLAZA", lane: "西南" },
  { from: "HALL_CORE", to: "EXIT_S", lane: "正南" },
  { from: "EXIT_S", to: "L2_S", lane: "正南" },
  { from: "L2_S", to: "L1_S", lane: "正南" },
  { from: "L1_S", to: "WEST_PLAZA", lane: "正南" },
  { from: "HALL_CORE", to: "HALL_EAST", lane: "正北" },
  { from: "HALL_EAST", to: "EXIT_N", lane: "正北" },
  { from: "EXIT_N", to: "L2_N", lane: "正北" },
  { from: "L2_N", to: "L1_N", lane: "正北" },
  { from: "L1_N", to: "WEST_PLAZA", lane: "正北" },
  { from: "HALL_CORE", to: "HALL_WEST", lane: "西北" },
  { from: "HALL_WEST", to: "EXIT_NW", lane: "西北" },
  { from: "EXIT_NW", to: "L2_NW", lane: "西北" },
  { from: "L2_NW", to: "L1_NW", lane: "西北" },
  { from: "L1_NW", to: "WEST_PLAZA", lane: "西北" },
]

const nodeById = new Map(nodes.map((node) => [node.id, node]))

export function manhattanDistance(a: Point, b: Point) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
}

function routeDensity(exit: ExitDirection, regions: RegionState[], minute: number) {
  const hall = regions.find((region) => region.id === "hall")?.density ?? 0
  const plaza = regions.find((region) => region.id === "plaza")?.density ?? 0
  const phaseLoads: Record<ExitDirection, number>[] = [
    { 西南: 0.02, 正南: 0.48, 正北: 0.62, 西北: 0.43 },
    { 西南: 0.68, 正南: 0.02, 正北: 0.58, 西北: 0.49 },
    { 西南: 0.68, 正南: 0.62, 正北: 0.01, 西北: 0.54 },
    { 西南: 0.65, 正南: 0.68, 正北: 0.58, 西北: 0.01 },
  ]
  const phase = minute < 24 ? 0 : minute < 28 ? 1 : minute < 32 ? 2 : 3
  const wave = (Math.sin(minute * 0.61 + routeMeta.findIndex((route) => route.exit === exit) * 1.7) + 1) * 0.025
  return Math.min(0.96, Math.max(0.05, hall * 0.28 + plaza * 0.18 + phaseLoads[phase][exit] + wave))
}

function neighbors(nodeId: string, lane: ExitDirection) {
  return edges.flatMap((edge) => {
    if (edge.lane !== lane) return []
    if (edge.from === nodeId) return [{ id: edge.to }]
    if (edge.to === nodeId) return [{ id: edge.from }]
    return []
  })
}

// Improved A*: Manhattan distance is the heuristic and the traversed edge
// cost continuously blends path length, live crowd density and a turn penalty.
export function improvedAStar(startId: string, goalId: string, lane: ExitDirection, density: number) {
  const start = nodeById.get(startId)!
  const goal = nodeById.get(goalId)!
  const open = new Set([startId])
  const cameFrom = new Map<string, string>()
  const gScore = new Map<string, number>([[startId, 0]])
  const fScore = new Map<string, number>([[startId, manhattanDistance(start, goal)]])

  while (open.size) {
    const currentId = [...open].sort((a, b) => (fScore.get(a) ?? Infinity) - (fScore.get(b) ?? Infinity))[0]
    if (currentId === goalId) {
      const path = [currentId]
      let cursor = currentId
      while (cameFrom.has(cursor)) {
        cursor = cameFrom.get(cursor)!
        path.unshift(cursor)
      }
      return path
    }
    open.delete(currentId)
    const current = nodeById.get(currentId)!
    for (const neighborRef of neighbors(currentId, lane)) {
      const neighbor = nodeById.get(neighborRef.id)!
      const lengthCost = manhattanDistance(current, neighbor)
      const densityWeight = 1 + density * 3.2
      const previous = cameFrom.get(currentId)
      const previousNode = previous ? nodeById.get(previous) : null
      const turnPenalty = previousNode && (previousNode.x === current.x) !== (current.x === neighbor.x) ? 1.5 : 0
      const tentative = (gScore.get(currentId) ?? Infinity) + lengthCost * densityWeight + turnPenalty
      if (tentative >= (gScore.get(neighbor.id) ?? Infinity)) continue
      cameFrom.set(neighbor.id, currentId)
      gScore.set(neighbor.id, tentative)
      fScore.set(neighbor.id, tentative + manhattanDistance(neighbor, goal) * 1.08)
      open.add(neighbor.id)
    }
  }
  return []
}

function dedupePath(ids: string[]) {
  return ids.filter((id, index) => index === 0 || id !== ids[index - 1])
}

export function computeDynamicRoutes(regions: RegionState[], minute: number): DynamicRoute[] {
  const candidates = routeMeta.map((meta) => {
    const density = routeDensity(meta.exit, regions, minute)
    const first = improvedAStar("HALL_CORE", meta.via, meta.exit, density)
    const second = improvedAStar(meta.via, "WEST_PLAZA", meta.exit, density)
    const nodeIds = dedupePath([...first, ...second.slice(1)])
    const points = nodeIds.map((id) => nodeById.get(id)!).map(({ x, y }) => ({ x, y }))
    const mapDistance = points.slice(1).reduce((sum, point, index) => sum + manhattanDistance(points[index], point), 0)
    const distanceMeters = Math.round(mapDistance * 4.25)
    const score = Number((distanceMeters * (1 + density * 2.85)).toFixed(2))
    const walkingSpeed = Math.max(0.58, 1.18 * (1 - density * 0.48))
    const estimatedMinutes = Number((distanceMeters / walkingSpeed / 60).toFixed(1))
    return {
      ...meta,
      points,
      distanceMeters,
      density: Number(density.toFixed(3)),
      estimatedMinutes,
      score,
      recommended: false,
      reason: "实时融合通道密度、路径长度与转向代价",
    }
  })
  const best = [...candidates].sort((a, b) => a.score - b.score)[0]
  return candidates.map((route) => ({
    ...route,
    recommended: route.id === best.id,
    reason: route.id === best.id ? "当前综合代价最低，系统实时推荐" : route.reason,
  }))
}

function pointAlongRoute(points: Point[], progress: number) {
  const segments = points.slice(1).map((point, index) => {
    const previous = points[index]
    return { from: previous, to: point, length: Math.hypot(point.x - previous.x, point.y - previous.y) }
  })
  const total = segments.reduce((sum, segment) => sum + segment.length, 0)
  let remaining = progress * total
  for (const segment of segments) {
    if (remaining <= segment.length) {
      const ratio = remaining / Math.max(0.001, segment.length)
      return {
        x: segment.from.x + (segment.to.x - segment.from.x) * ratio,
        y: segment.from.y + (segment.to.y - segment.from.y) * ratio,
      }
    }
    remaining -= segment.length
  }
  return points.at(-1) ?? { x: 31, y: 76 }
}

export function synchronizeAgentsWithRoutes(agents: AgentPoint[], routes: DynamicRoute[], minute: number) {
  if (minute < 21 || minute >= 35) return agents
  const recommended = routes.find((route) => route.recommended) ?? routes[0]
  const alternates = routes.filter((route) => route.id !== recommended.id)
  let movingIndex = 0
  return agents.map((agent) => {
    if (agent.regionId !== "hall" || movingIndex >= 72) return agent
    const index = movingIndex++
    const route = index % 10 < 5 ? recommended : alternates[index % Math.max(1, alternates.length)]
    const progress = ((minute - 21) * 0.09 + index * 0.053) % 1
    return { ...agent, ...pointAlongRoute(route.points, progress) }
  })
}

export function routePointsToSvg(points: Point[]) {
  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ")
}
