import assert from "node:assert/strict"
import { readFile, readdir } from "node:fs/promises"
import path from "node:path"

const root = process.cwd()
const readJson = async (file) => JSON.parse(await readFile(path.join(root, file), "utf8"))
const packageJson = await readJson("package.json")
const baselineVersion = (await readFile(path.join(root, "VERSION"), "utf8")).trim()
const timeline = await readJson("data/script_timeline.json")
const initial = await readJson("data/initial_conditions.json")
const devices = await readJson("data/device_config.json")
const density = await readJson("data/density_config.json")
const monitors = await readJson("data/monitor_config.json")
const paths = await readJson("data/path_network.json")

assert.equal(packageJson.version, baselineVersion, "package.json 与 VERSION 不一致")
for (const [file, label] of [["README.md", "版本"], ["DELIVERY_MANIFEST.md", "交付版本"]]) {
  const content = await readFile(path.join(root, file), "utf8")
  assert.ok(content.includes(`${label}：${baselineVersion}`), `${file} 未同步版本`)
}
assert.equal(timeline.schemaVersion, "1.0.0")
assert.equal(timeline.events.length, 15, "技术规格表实际包含15个时间节点")
assert.equal(timeline.events[0].minute, 0)
assert.equal(timeline.events.at(-1).minute, 47)
assert.ok(timeline.events.every((event, index, list) => index === 0 || event.minute > list[index - 1].minute), "时间线必须严格递增")

const distributionTotal = Object.values(initial.passengers.initialDistribution).reduce((sum, value) => sum + value, 0)
assert.equal(distributionTotal, initial.passengers.total, "初始区域人数之和必须等于总人数")
assert.equal(new Set(initial.trains.stoppedTrainNumbers).size, initial.trains.stoppedCount, "停运车次数量不一致")
assert.equal(devices.schemaVersion, "3.0.0", "设备配置必须使用精简设备3.0结构")
assert.equal(Object.values(devices.deviceClassCounts).reduce((sum, value) => sum + value, 0), devices.physicalAssetCount, "脚本设备物资总量不一致")
assert.deepEqual(paths.exitDirections, ["正南", "正北", "西南", "西北"], "四向出口配置不完整")
assert.equal(paths.engine, "improved_a_star", "动态路径未启用改进型A*算法")
assert.equal(paths.heuristic, "manhattan_distance", "动态路径未融合曼哈顿距离")
assert.deepEqual(density.colors.map((item) => item.hex), ["#4CAF50", "#FFEB3B", "#FF9800", "#F44336"], "KDE四色阈值未同步")
assert.equal(monitors.sharedStateSource, "lib/agent-density.ts#createAgentSnapshot", "监控未绑定统一Agent快照")
assert.ok(monitors.monitors.every((monitor) => Array.isArray(monitor.regionIds) && monitor.regionIds.length > 0), "监控缺少区域绑定")

const docFiles = (await readdir(path.join(root, "docs"))).filter((file) => file.endsWith(".md") && /^0\d_/.test(file))
assert.ok(docFiles.length >= 7, "核心技术文档不完整")
for (const file of docFiles) {
  const content = await readFile(path.join(root, "docs", file), "utf8")
  assert.ok(content.includes(`基线版本：${baselineVersion}`), `${file} 未同步基线版本`)
}

console.log(`版本同步校验通过：${baselineVersion}，${timeline.events.length}个事件，${docFiles.length}份核心文档。`)
