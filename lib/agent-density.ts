import type { RegionState } from "@/lib/simulation"

export type Point = { x: number; y: number }
export type AgentPoint = Point & { id: string; regionId: string; weight: number; delay: number }
export type HeatCell = Point & { id: string; regionId: string; width: number; height: number; density: number; color: string }

type Zone = Point & { w: number; h: number }

type RegionGeometry = {
  zones: Zone[]
  bandwidth: number
}

// Percentage-based display ranges align the Agent dots with the three floor
// drawings without introducing visible polygon masks or polygon-bound motion.
export const regionGeometries: Record<string, RegionGeometry> = {
  hall: { zones: [{ x: 28, y: 13, w: 47, h: 16 }], bandwidth: 2.7 },
  perimeter: {
    zones: [{ x: 16, y: 13, w: 11, h: 16 }, { x: 75, y: 13, w: 8, h: 16 }],
    bandwidth: 2.2,
  },
  gates: { zones: [{ x: 30, y: 18, w: 41, h: 8 }], bandwidth: 2 },
  ticket: { zones: [{ x: 53, y: 11, w: 14, h: 6 }], bandwidth: 1.7 },
  platform: { zones: [{ x: 17, y: 39, w: 67, h: 17 }], bandwidth: 2.8 },
  plaza: { zones: [{ x: 20, y: 69, w: 27, h: 11 }], bandwidth: 2.3 },
}

function hash(value: number) {
  const n = Math.sin(value * 127.1) * 43758.5453
  return n - Math.floor(n)
}

function zoneArea(zone: Zone) {
  return zone.w * zone.h
}

function chooseZone(geometry: RegionGeometry, seed: number) {
  if (geometry.zones.length === 1) return geometry.zones[0]
  const total = geometry.zones.reduce((sum, zone) => sum + zoneArea(zone), 0)
  let target = hash(seed) * total
  for (const zone of geometry.zones) {
    target -= zoneArea(zone)
    if (target <= 0) return zone
  }
  return geometry.zones.at(-1)!
}

function safePointInZone(zone: Zone, seed: number) {
  const marginX = Math.min(1.2, zone.w * 0.08)
  const marginY = Math.min(0.8, zone.h * 0.08)
  return {
    x: zone.x + marginX + hash(seed + 1) * Math.max(0.1, zone.w - marginX * 2),
    y: zone.y + marginY + hash(seed + 7) * Math.max(0.1, zone.h - marginY * 2),
  }
}

export function createAgentSnapshot(regions: RegionState[], minute: number) {
  const agents: AgentPoint[] = []
  regions.forEach((region, regionIndex) => {
    const geometry = regionGeometries[region.id]
    if (!geometry || region.count <= 0) return
    const representativeCount = Math.ceil(region.count / 50)
    for (let index = 0; index < representativeCount; index += 1) {
      const seed = regionIndex * 100003 + index * 97 + 31
      const zone = chooseZone(geometry, seed)
      const from = safePointInZone(zone, seed)
      const to = safePointInZone(zone, seed + 4099)
      const phase = (Math.sin(minute * 0.16 + hash(seed + 3) * Math.PI * 2) + 1) / 2
      const remaining = region.count - index * 50
      agents.push({
        id: `${region.id}-${index}`,
        regionId: region.id,
        x: from.x + (to.x - from.x) * phase,
        y: from.y + (to.y - from.y) * phase,
        weight: Math.min(50, remaining),
        delay: hash(seed + 19) * 1.7,
      })
    }
  })
  return agents
}

export function densityColor(density: number) {
  if (density < 0.3) return "#4CAF50"
  if (density < 0.6) return "#FFEB3B"
  if (density < 0.85) return "#FF9800"
  return "#F44336"
}

export function computeKdeHeatmap(agents: AgentPoint[], regions: RegionState[]): HeatCell[] {
  const cells: HeatCell[] = []
  regions.forEach((region) => {
    const geometry = regionGeometries[region.id]
    const regionAgents = agents.filter((agent) => agent.regionId === region.id)
    if (!geometry || regionAgents.length === 0) return
    const candidates: Array<Point & { raw: number; zoneIndex: number }> = []
    geometry.zones.forEach((zone, zoneIndex) => {
      for (let y = zone.y + 0.9; y < zone.y + zone.h; y += 1.8) {
        for (let x = zone.x + 1.1; x < zone.x + zone.w; x += 2.2) {
          const raw = regionAgents.reduce((sum, agent) => {
            const dx = x - agent.x
            const dy = y - agent.y
            return sum + agent.weight * Math.exp(-(dx * dx + dy * dy) / (2 * geometry.bandwidth * geometry.bandwidth))
          }, 0)
          candidates.push({ x, y, raw, zoneIndex })
        }
      }
    })
    const maximum = Math.max(1, ...candidates.map((candidate) => candidate.raw))
    candidates.forEach((candidate, index) => {
      const localKde = candidate.raw / maximum
      const normalized = Math.max(0, Math.min(1, region.density * (0.78 + localKde * 0.3)))
      cells.push({
        id: `${region.id}-${candidate.zoneIndex}-${index}`,
        regionId: region.id,
        x: candidate.x,
        y: candidate.y,
        width: 2.35,
        height: 1.95,
        density: normalized,
        color: densityColor(normalized),
      })
    })
  })
  return cells
}

export function getCombinedBounds(regionIds: string[]) {
  const zones = regionIds.flatMap((regionId) => regionGeometries[regionId]?.zones ?? [])
  if (!zones.length) return { x: 0, y: 0, w: 100, h: 100 }
  const minX = Math.min(...zones.map((zone) => zone.x))
  const minY = Math.min(...zones.map((zone) => zone.y))
  const maxX = Math.max(...zones.map((zone) => zone.x + zone.w))
  const maxY = Math.max(...zones.map((zone) => zone.y + zone.h))
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
}

export function isAgentInsideRegion(agent: AgentPoint) {
  return (regionGeometries[agent.regionId]?.zones ?? []).some((zone) => agent.x >= zone.x && agent.x <= zone.x + zone.w && agent.y >= zone.y && agent.y <= zone.y + zone.h)
}
