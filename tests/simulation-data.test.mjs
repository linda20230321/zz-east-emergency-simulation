import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

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

test("五类设备数量与规格书一致", async () => {
  const data = await readJson("data/device_config.json")
  assert.deepEqual(data.deviceClassCounts, { gate: 4, broadcast: 6, display: 5, door: 4, sign: 20 })
  assert.equal(Object.values(data.deviceClassCounts).reduce((sum, value) => sum + value, 0), 39)
  assert.equal(data.totalDevices, 39)
  assert.equal(data.devices.filter((item) => item.type === "gate").length, 4)
  assert.equal(data.devices.filter((item) => item.type === "broadcast").length, 6)
  assert.equal(data.devices.filter((item) => item.type === "display").length, 5)
  assert.equal(data.devices.filter((item) => item.type === "door").length, 4)
  assert.equal(data.signIds.length, 20)
})

test("六路监控均为明确标识的仿真占位源", async () => {
  const data = await readJson("data/monitor_config.json")
  assert.equal(data.monitors.length, 6)
  assert.equal(data.sourceMode, "simulated_placeholder")
  assert.equal(data.realStreamConnected, false)
  assert.equal(data.displayMode, "floating_draggable_collapsible_window")
  assert.equal(data.canvasInteraction, "drag_pan_with_zoom_controls_no_scrollbar")
})

test("三层使用同一总体布局底图且无楼层标签切换", async () => {
  const dashboard = await readFile(new URL("../components/simulation-dashboard.tsx", import.meta.url), "utf8")
  const overview = await readFile(new URL("../components/station-overview-map.tsx", import.meta.url), "utf8")
  assert.match(dashboard, /StationOverviewMap/)
  assert.doesNotMatch(dashboard, /TabsTrigger|StationMap/)
  assert.match(overview, /\/assets\/zhengzhou-east-layout\.png/)
  assert.match(overview, /animated-route/)
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
