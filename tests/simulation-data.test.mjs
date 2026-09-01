import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"
import { computeKdeHeatmap, createAgentSnapshot, isAgentInsideRegion } from "../lib/agent-density.ts"
import { computeDynamicRoutes, improvedAStar, manhattanDistance, synchronizeAgentsWithRoutes } from "../lib/dynamic-routing.ts"

const readJson = async (file) => JSON.parse(await readFile(new URL(`../${file}`, import.meta.url), "utf8"))

test("初始客流总量守恒", async () => {
  const data = await readJson("data/initial_conditions.json")
  const total = Object.values(data.passengers.initialDistribution).reduce((sum, value) => sum + value, 0)
  assert.equal(total, 37000)
})

test("时间线覆盖09:00至09:47且严格递增", async () => {
  const data = await readJson("data/script_timeline.json")
  assert.equal(data.events[0].time, "09:00")
  assert.equal(data.events.at(-1).time, "09:47")
  assert.ok(data.events.every((event, index, list) => index === 0 || event.minute > list[index - 1].minute))
})

test("设备精简范围与数量映射完整", async () => {
  const data = await readJson("data/device_config.json")
  assert.equal(data.schemaVersion, "3.0.0")
  assert.equal(data.deviceClassCounts.gate, 4)
  assert.equal(data.deviceClassCounts.broadcast, 6)
  assert.equal(data.deviceClassCounts.display, 5)
  assert.equal(data.deviceClassCounts.door, 4)
  assert.equal(data.deviceClassCounts.window, 2)
  assert.equal(data.deviceClassCounts.monitor, 6)
  assert.deepEqual(data.removedDeviceClasses, ["sign", "barrier", "radio", "vehicle", "medical", "system", "support"])
  assert.equal(Object.values(data.deviceClassCounts).reduce((sum, value) => sum + value, 0), data.physicalAssetCount)
})

test("每个脚本节点包含流程、岗位职责与设备操作映射", async () => {
  const source = await readFile(new URL("../lib/scenario-script.ts", import.meta.url), "utf8")
  for (const time of ["09:00", "09:02", "09:05", "09:12", "09:13", "09:17", "09:19", "09:21", "09:23", "09:26", "09:29", "09:32", "09:35", "09:46", "09:47"]) assert.match(source, new RegExp(time))
  for (const token of ["roles", "actions", "monitorIds", "32B检票口小区广播", "正南进站大屏", "50、51号售票窗口", "改进型A\\*"]) assert.match(source, new RegExp(token))
  for (const token of ["getScriptRuntimeStep", "G806放行宣传", "G1808放行宣传", "G51绿色通道宣传"]) assert.match(source, new RegExp(token))
  for (const token of ["公告牌", "隔离带", "对讲机", "大巴车", "应急通信车", "医疗点", "旅服系统", "12306原退系统", "演练桌"]) assert.doesNotMatch(source, new RegExp(token))
})

test("六路监控均为明确标识的仿真占位源", async () => {
  const data = await readJson("data/monitor_config.json")
  assert.equal(data.monitors.length, 6)
  assert.equal(data.sourceMode, "simulated_placeholder")
  assert.equal(data.realStreamConnected, false)
  assert.equal(data.displayMode, "floating_draggable_collapsible_window")
  assert.equal(data.canvasInteraction, "drag_pan_with_zoom_controls_no_scrollbar")
  assert.equal(data.routeStateSource, "lib/dynamic-routing.ts#computeDynamicRoutes")
  assert.ok(data.monitors.every((monitor) => monitor.scriptScene))
})

test("三层使用同一总体布局底图且无楼层标签切换", async () => {
  const dashboard = await readFile(new URL("../components/simulation-dashboard.tsx", import.meta.url), "utf8")
  const overview = await readFile(new URL("../components/station-overview-map.tsx", import.meta.url), "utf8")
  const baseMap = await readFile(new URL("../public/assets/zhengzhou-east-layout.png", import.meta.url))
  assert.match(dashboard, /StationOverviewMap/)
  assert.doesNotMatch(dashboard, /TabsTrigger|StationMap/)
  assert.match(overview, /\/assets\/zhengzhou-east-layout\.png/)
  assert.match(overview, /animated-route/)
  assert.doesNotMatch(overview, /郑州东站总布局图/)
  assert.equal(baseMap.readUInt32BE(16), 1842)
  assert.equal(baseMap.readUInt32BE(20), 3414)
  for (const token of ["floor-total-layer", "各楼层实时总人数", "boardingServices", "站台乘车联动", "乘车人数", "2道", "综控未指定"]) assert.match(overview, new RegExp(token))
  for (const token of ["map-compass", "正南出口", "正北出口", "西南出口", "西北出口", "上北、下南、左西、右东"]) assert.match(overview, new RegExp(token))
})

test("总图支持无滚动条拖拽缩放且监控面板可折叠", async () => {
  const overview = await readFile(new URL("../components/station-overview-map.tsx", import.meta.url), "utf8")
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8")
  assert.match(overview, /ZoomIn/)
  assert.match(overview, /ZoomOut/)
  assert.match(overview, /onWheel=/)
  assert.match(overview, /event\.deltaY/)
  assert.match(overview, /monitor-panel-toggle/)
  assert.match(overview, /zhengzhou-east-layout\.png/)
  assert.doesNotMatch(overview, /route-live-legend/)
  assert.match(css, /\.overview-map-stage[^}]*overflow: hidden/)
  assert.match(css, /\.map-pan-layer[^}]*width: min\(1040px/)
  assert.match(css, /\.map-pan-layer[^}]*height: min\(95%/)
})

test("核心态势数字看板支持预判、变化量和动态趋势", async () => {
  const dashboard = await readFile(new URL("../components/simulation-dashboard.tsx", import.meta.url), "utf8")
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8")
  for (const token of ["10分钟站内积压预判", "站内实时积压人数", "晚点列车", "停运列车", "useAnimatedNumber", "TrendLine", "forecastBacklog", "backlogDelta"]) assert.match(dashboard, new RegExp(token))
  assert.match(css, /\.metric-grid[^}]*repeat\(8/)
  assert.match(css, /\.metric-sparkline/)
  assert.match(css, /\.metric-card\.is-changing/)
})

test("KDE算法、圆点人员与监控采用同一Agent快照且Web无热力网格和多边形蒙版", async () => {
  const density = await readFile(new URL("../lib/agent-density.ts", import.meta.url), "utf8")
  const overview = await readFile(new URL("../components/station-overview-map.tsx", import.meta.url), "utf8")
  const shader = await readFile(new URL("../unity/Shaders/KdeHeatmapOverlay.shader", import.meta.url), "utf8")
  for (const token of ["createAgentSnapshot", "computeKdeHeatmap", "safePointInZone", "zones", "#4CAF50", "#FFEB3B", "#FF9800", "#F44336"]) assert.match(density, new RegExp(token))
  assert.doesNotMatch(density, /pointInPolygon|polygonCentroid/)
  assert.doesNotMatch(overview, /<polygon/)
  assert.doesNotMatch(overview, /density-summary-layer|density-heat-legend|· d=/)
  assert.match(overview, /agents=\{agents\}/)
  assert.match(overview, /底图\/人员\/路线同源同步/)
  assert.match(overview, /overview-passenger/)
  assert.doesNotMatch(overview, /kde-heatmap-layer|heatCells\.map|<rect/)
  assert.match(shader, /density < 0\.30/)
  assert.match(shader, /density < 0\.60/)
  assert.match(shader, /density < 0\.85/)
})

test("全部时间采样的Agent显示范围、人数权重与KDE归一化有效", () => {
  const regions = [
    { id: "hall", name: "3F候车大厅", floor: "3F", count: 28000, capacity: 35000, density: 0.8 },
    { id: "perimeter", name: "3F商业及通道", floor: "3F", count: 5000, capacity: 12000, density: 5 / 12 },
    { id: "gates", name: "3F检票口集结区", floor: "3F", count: 2500, capacity: 5000, density: 0.5 },
    { id: "ticket", name: "3F第八售票处", floor: "3F", count: 1000, capacity: 3000, density: 1 / 3 },
    { id: "platform", name: "2F站台层", floor: "2F", count: 500, capacity: 12000, density: 1 / 24 },
    { id: "plaza", name: "1F西广场候车区", floor: "1F", count: 0, capacity: 18000, density: 0 },
  ]
  for (let minute = 0; minute <= 47; minute += 0.25) {
    const agents = createAgentSnapshot(regions, minute)
    assert.ok(agents.every(isAgentInsideRegion), `第${minute}分钟存在越界Agent`)
    assert.equal(agents.reduce((sum, agent) => sum + agent.weight, 0), 37000)
    assert.ok(computeKdeHeatmap(agents, regions).every((cell) => cell.density >= 0 && cell.density <= 1))
  }
})

test("四向动态路径使用融合曼哈顿距离的改进型A星并随密度切换推荐", async () => {
  const data = await readJson("data/path_network.json")
  assert.equal(data.engine, "improved_a_star")
  assert.equal(data.heuristic, "manhattan_distance")
  assert.deepEqual(data.exitDirections, ["正南", "正北", "西南", "西北"])
  assert.deepEqual(data.paths.map((item) => item.id), ["EVAC_SW", "EVAC_S", "EVAC_N", "EVAC_NW"])
  assert.equal(manhattanDistance({ x: 2, y: 3 }, { x: 8, y: 10 }), 13)
  assert.ok(improvedAStar("HALL_CORE", "WEST_PLAZA", "西南", 0.2).length >= 5)

  const recommendations = new Set()
  for (const minute of [22, 26, 30, 33]) {
    const regions = [
      { id: "hall", name: "3F候车大厅", floor: "3F", count: 26000, capacity: 35000, density: 26000 / 35000 },
      { id: "plaza", name: "1F西广场候车区", floor: "1F", count: Math.round((minute - 21) * 900), capacity: 18000, density: Math.min(1, ((minute - 21) * 900) / 18000) },
    ]
    const routes = computeDynamicRoutes(regions, minute)
    assert.equal(routes.length, 4)
    assert.equal(routes.filter((route) => route.recommended).length, 1)
    assert.ok(routes.every((route) => route.points[0].x === 52 && route.points.at(-1).x === 31))
    recommendations.add(routes.find((route) => route.recommended).id)
    const agents = createAgentSnapshot(regions, minute)
    const synchronized = synchronizeAgentsWithRoutes(agents, routes, minute)
    assert.equal(synchronized.length, agents.length)
    assert.ok(synchronized.some((agent, index) => agent.x !== agents[index].x || agent.y !== agents[index].y))
  }
  assert.ok(recommendations.size >= 3, "客流变化后推荐路线应发生切换")
})

test("数据库包含回放、指标、审计和追溯表", async () => {
  const sql = await readFile(new URL("../database/001_schema.sql", import.meta.url), "utf8")
  const seed = await readFile(new URL("../database/002_seed_baseline.sql", import.meta.url), "utf8")
  for (const table of ["state_snapshot", "region_metric", "device_event_log", "consistency_check", "requirement_trace", "change_record"]) {
    assert.match(sql, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`))
  }
  assert.match(sql, /VALUES \('0\.8\.0', 'NORTH-UP-DYNAMIC-ASTAR-2026-09-01'/)
  assert.match(seed, /'09:00', '09:47', '0\.8\.0', 'approved'/)
})
