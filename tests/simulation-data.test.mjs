import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"
import { computeKdeHeatmap, createAgentSnapshot, isAgentInsideRegion } from "../lib/agent-density.ts"

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

test("脚本设备、物资与数量映射完整", async () => {
  const data = await readJson("data/device_config.json")
  assert.equal(data.schemaVersion, "2.0.0")
  assert.equal(data.deviceClassCounts.broadcast, 6)
  assert.equal(data.deviceClassCounts.display, 5)
  assert.equal(data.deviceClassCounts.sign, 151)
  assert.equal(data.deviceClassCounts.barrier, 240)
  assert.equal(data.deviceClassCounts.radio, 16)
  assert.equal(data.deviceClassCounts.monitor, 6)
  assert.equal(Object.values(data.deviceClassCounts).reduce((sum, value) => sum + value, 0), data.physicalAssetCount)
})

test("每个脚本节点包含流程、岗位职责与设备操作映射", async () => {
  const source = await readFile(new URL("../lib/scenario-script.ts", import.meta.url), "utf8")
  for (const time of ["09:00", "09:02", "09:05", "09:12", "09:13", "09:17", "09:19", "09:21", "09:23", "09:26", "09:29", "09:32", "09:35", "09:46", "09:47"]) assert.match(source, new RegExp(time))
  for (const token of ["roles", "actions", "monitorIds", "32B检票口小区广播", "正南进站大屏", "50、51号售票窗口", "隔离带200根"]) assert.match(source, new RegExp(token))
  for (const token of ["getScriptRuntimeStep", "G806放行宣传", "G1808放行宣传", "G51绿色通道宣传"]) assert.match(source, new RegExp(token))
})

test("六路监控均为明确标识的仿真占位源", async () => {
  const data = await readJson("data/monitor_config.json")
  assert.equal(data.monitors.length, 6)
  assert.equal(data.sourceMode, "simulated_placeholder")
  assert.equal(data.realStreamConnected, false)
  assert.equal(data.displayMode, "floating_draggable_collapsible_window")
  assert.equal(data.canvasInteraction, "drag_pan_with_zoom_controls_no_scrollbar")
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
  assert.match(overview, /同源Agent快照/)
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

test("8条业务路径完整", async () => {
  const data = await readJson("data/path_network.json")
  assert.deepEqual(data.paths.map((item) => item.id), ["PATH_1", "PATH_2", "PATH_3", "PATH_4", "PATH_5", "PATH_6", "PATH_7", "PATH_8"])
})

test("数据库包含回放、指标、审计和追溯表", async () => {
  const sql = await readFile(new URL("../database/001_schema.sql", import.meta.url), "utf8")
  for (const table of ["state_snapshot", "region_metric", "device_event_log", "consistency_check", "requirement_trace", "change_record"]) {
    assert.match(sql, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`))
  }
})
