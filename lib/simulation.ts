import { getScriptRuntimeStep } from "@/lib/scenario-script"

export type FloorId = "3F" | "2F" | "1F"

export type SimulationEvent = {
  minute: number
  time: string
  title: string
  location: string
  summary: string
  action: string
  severity: "info" | "warning" | "critical" | "success"
}

export type RegionState = {
  id: string
  name: string
  floor: FloorId
  count: number
  capacity: number
  density: number
}

export type DeviceState = {
  id: string
  name: string
  type: "gate" | "broadcast" | "display" | "door" | "window"
  floor: FloorId
  x: number
  y: number
  status: string
  tone: "normal" | "warning" | "critical" | "active" | "offline"
  detail: string
  quantity: number
  location: string
  owner: string
  scriptRef: string
}

export const SIMULATION_START = 9 * 60
export const SIMULATION_DURATION = 47
export const TOTAL_PASSENGERS = 37000

export const events: SimulationEvent[] = [
  { minute: 0, time: "09:00", title: "演练背景", location: "生产指挥中心", summary: "京广高铁因水害中断，进入大面积晚点旅客滞留处置场景。", action: "加载37,000名旅客、68列晚点和6列停运的初始条件。", severity: "info" },
  { minute: 2, time: "09:02", title: "启动一级响应", location: "生产指挥中心", summary: "集团公司调度所下达I级应急响应命令。", action: "六个应急小组接令，系统记录响应启动事件。", severity: "critical" },
  { minute: 5, time: "09:05", title: "岗位到位与限流", location: "全站", summary: "应急人员到岗，西南/西北口关闭，南北主入口实施2小时限行。", action: "闸机、换乘直梯状态联动，动态路径网络开始预计算。", severity: "critical" },
  { minute: 12, time: "09:12", title: "客运车间响应", location: "生产指挥中心", summary: "综控、售票、进站口、一层疏散、站台和服务台岗位完成部署。", action: "岗位态势更新为已到位。", severity: "warning" },
  { minute: 13, time: "09:13", title: "综控计划处置", location: "综控计划室", summary: "核对晚点、停运和接续列车信息。", action: "加载列车数据并形成接续疏散建议。", severity: "info" },
  { minute: 17, time: "09:17", title: "晚点广播", location: "32B检票口", summary: "循环播放致歉、停运退票和分区候车广播。", action: "广播设备进入自动播报，停运旅客获得退票与分流信息。", severity: "warning" },
  { minute: 19, time: "09:19", title: "停运信息发布", location: "服务台/南北进站口", summary: "进站大屏和服务台广告屏同步显示停运公告。", action: "信息屏切换应急模式，服务台进行人工解释。", severity: "warning" },
  { minute: 21, time: "09:21", title: "大规模疏散启动", location: "3F候车厅→1F西广场", summary: "两小时以外旅客沿主疏散路径转移至一层西广场。", action: "西广场通道单向开启，路径1全线标识点亮。", severity: "critical" },
  { minute: 23, time: "09:23", title: "候车分区组织", location: "B8-B9后方", summary: "启用1—2小时临时候车区与2小时以上集结区。", action: "根据实时密度重算四条候选路线，客流按推荐路径分流。", severity: "warning" },
  { minute: 26, time: "09:26", title: "增开退改签窗口", location: "第八售票处", summary: "50、51号窗口增开并显示晚点、停运列车退票公告。", action: "退票流线激活，售票处客流增加。", severity: "info" },
  { minute: 29, time: "09:29", title: "密度驱动分流优化", location: "候车室→一层西广场", summary: "四条疏散通道根据实时客流密度持续分担下行旅客。", action: "融合曼哈顿距离的改进型A*重新排序候选路线并切换推荐。", severity: "warning" },
  { minute: 32, time: "09:32", title: "西南口只出不进", location: "西南进站口", summary: "扶梯三层节点实施宣传和限流。", action: "西南通道保持单向疏散，其他三条通道继续动态分流。", severity: "warning" },
  { minute: 35, time: "09:35", title: "西广场候车与回流", location: "1F西广场", summary: "G806、G1808、G51等旅客分批通过绿色通道回流。", action: "路径3/4反向激活，绿色通道和回流标识闪烁。", severity: "critical" },
  { minute: 46, time: "09:46", title: "疏散基本完成", location: "全站", summary: "候车厅控制在约2万人，西广场秩序正常。", action: "部分应急标识关闭，保持分批进站。", severity: "success" },
  { minute: 47, time: "09:47", title: "响应结束", location: "生产指挥中心", summary: "京广高铁运输秩序逐步恢复，I级响应结束。", action: "所有设备恢复常规状态并生成复盘快照。", severity: "success" },
]

const occupancyKeyframes = [
  { minute: 0, hall: 28000, perimeter: 5000, gates: 2500, ticket: 1000, platform: 500, plaza: 0 },
  { minute: 21, hall: 27500, perimeter: 4800, gates: 2600, ticket: 1100, platform: 1000, plaza: 0 },
  { minute: 35, hall: 18000, perimeter: 1500, gates: 2000, ticket: 1500, platform: 0, plaza: 14000 },
  { minute: 46, hall: 20000, perimeter: 1000, gates: 2000, ticket: 1500, platform: 2500, plaza: 10000 },
  { minute: 47, hall: 20000, perimeter: 1000, gates: 2000, ticket: 1500, platform: 2500, plaza: 10000 },
]

function interpolate(minute: number, key: keyof Omit<(typeof occupancyKeyframes)[number], "minute">) {
  const safeMinute = Math.max(0, Math.min(SIMULATION_DURATION, minute))
  const rightIndex = occupancyKeyframes.findIndex((frame) => frame.minute >= safeMinute)
  if (rightIndex <= 0) return occupancyKeyframes[0][key]
  const right = occupancyKeyframes[rightIndex]
  const left = occupancyKeyframes[rightIndex - 1]
  const ratio = (safeMinute - left.minute) / (right.minute - left.minute || 1)
  return Math.round(left[key] + (right[key] - left[key]) * ratio)
}

export function getRegions(minute: number): RegionState[] {
  const regions: RegionState[] = [
    { id: "hall", name: "3F候车大厅", floor: "3F", count: interpolate(minute, "hall"), capacity: 35000, density: 0 },
    { id: "perimeter", name: "3F商业及通道", floor: "3F", count: interpolate(minute, "perimeter"), capacity: 12000, density: 0 },
    { id: "gates", name: "3F检票口集结区", floor: "3F", count: interpolate(minute, "gates"), capacity: 5000, density: 0 },
    { id: "ticket", name: "3F第八售票处", floor: "3F", count: interpolate(minute, "ticket"), capacity: 3000, density: 0 },
    { id: "platform", name: "2F站台层", floor: "2F", count: interpolate(minute, "platform"), capacity: 12000, density: 0 },
    { id: "plaza", name: "1F西广场候车区", floor: "1F", count: interpolate(minute, "plaza"), capacity: 18000, density: 0 },
  ]
  return regions.map((region) => ({ ...region, density: Math.min(1, region.count / region.capacity) }))
}

function device(id: string, name: string, type: DeviceState["type"], floor: FloorId, x: number, y: number, status: string, tone: DeviceState["tone"], detail: string, quantity = 1, location = name, owner = "责任岗位", scriptRef = "演练脚本"): DeviceState {
  return { id, name, type, floor, x, y, status, tone, detail, quantity, location, owner, scriptRef }
}

const SCRIPT_REFUND_NOTICE = "应急演练公告：因水害原因造成列车停运，请已购买停运列车车次G7991、G804、G91、G77、G891、G1516车票的旅客，于30日内通过12306手机客户端或全国任意车站售票处免费办理退票手续，给您带来不便敬请谅解。（郑州东站）"

export function getDevices(minute: number): DeviceState[] {
  const scriptStep = getScriptRuntimeStep(minute)
  const emergency = minute >= 5 && minute < 47
  const evacuating = minute >= 21 && minute < 35
  const returning = minute >= 35 && minute < 47
  const activeBroadcast = (start: number, end = 47) => minute >= start && minute < end
  const activeDisplay = (start: number) => minute >= start && minute < 47
  const portableConfigs = minute >= 44 && minute < 46 ? [
    ["二层平台宣传喇叭", "2F", 29, 54, "G51绿色通道宣传", "高山"],
    ["西广场中部通道喇叭", "1F", 31, 78, "G51绿色通道宣传", "张雯"],
    ["便携喇叭3号", "1F", 24, 76, "待命", "张琛"],
    ["便携喇叭4号", "1F", 34, 76, "待命", "陈颖"],
  ] as const : minute >= 41 && minute < 44 ? [
    ["二层平台宣传喇叭", "2F", 29, 54, "G1808放行宣传", "高山"],
    ["西广场中部通道喇叭", "1F", 31, 78, "G1808放行宣传", "张雯"],
    ["便携喇叭3号", "1F", 24, 76, "待命", "张琛"],
    ["便携喇叭4号", "1F", 34, 76, "待命", "陈颖"],
  ] as const : minute >= 38 && minute < 41 ? [
    ["二层平台宣传喇叭", "2F", 29, 54, "G806放行宣传", "高山"],
    ["西广场中部通道喇叭", "1F", 31, 78, "G806放行宣传", "张雯"],
    ["便携喇叭3号", "1F", 24, 76, "待命", "张琛"],
    ["便携喇叭4号", "1F", 34, 76, "待命", "陈颖"],
  ] as const : minute >= 35 && minute < 38 ? [
    ["二层平台宣传喇叭", "2F", 29, 54, "应急演练通知：旅客们，您好，目前由于候车厅限流，请您按A、B检票口顺序、车次信息找到您所乘坐列车的候车位置，并在相应候车区域耐心等候，听从工作人员指挥统一进站。开车前半小时到达的旅客可以直接从进口两侧的绿色通道快速进站。", "高山"],
    ["西广场外侧通道喇叭", "1F", 24, 76, "应急演练通知：旅客朋友们，请按车次信息找到您所乘坐列车的候车位置，并耐心等候，感谢您的配合。", "张琛"],
    ["西广场候车区内喇叭", "1F", 34, 76, "应急演练通知：旅客朋友们，因水害造成列车大面积晚点，目前郑州东站采取限时候车制度，请您耐心在一层西广场候车区候车，听从工作人员指挥统一进站。", "陈颖"],
    ["西广场中部通道喇叭", "1F", 31, 78, "应急演练通知：请对应车次旅客听从工作人员指挥统一在一层西广场候车区中部排队进站；刚到达的旅客可根据指示标识从进站口两侧绿色通道直接进站，请提前准备好身份证并取出行李中液体物品。", "张雯"],
  ] as const : minute >= 32 && minute < 35 ? [
    ["3F西南扶梯喇叭", "3F", 20, 29, "旅客您好，因水害造成列车大面积晚点，郑州东站采取限时候车制度，请您凭当日当次车票于列车开车前两小时进入候车室，请持G258、G51、G1165、G806、G652、G3148车次的旅客前往一层西广场候车区进行候车。", "马瑞"],
    ["2F西南扶梯喇叭", "2F", 23, 48, "旅客您好，因水害造成列车大面积晚点，郑州东站采取限时候车制度，请您凭当日当次车票于列车开车前两小时进入候车室，请持G258、G51、G1165、G806、G652、G3148车次的旅客前往一层西广场候车区进行候车。", "蒋薇薇"],
    ["1F西南扶梯喇叭", "1F", 23, 72, "旅客您好，因水害造成列车大面积晚点，郑州东站采取限时候车制度，请您凭当日当次车票于列车开车前两小时进入候车室，请持G258、G51、G1165、G806、G652、G3148车次的旅客前往一层西广场候车区进行候车。", "梁苡菲"],
    ["便携喇叭4号", "1F", 35, 78, "待命", "一层疏散组"],
  ] as const : minute >= 26 && minute < 32 ? [
    ["第八售票处手持喇叭", "3F", 58, 13, "已购买停运列车车票的旅客，可在30日内通过12306手机客户端或全国任意车站售票处免费办理退票手续。已购买晚点30分钟以上列车车票的旅客，可在列车实际发车时间前通过12306手机客户端免费办理退票手续。", "任欣韫"],
    ["B4/B5集结区喇叭", "3F", 36, 24, "乘坐G258、G51、G1165、G806、G652、G3148的旅客请跟随工作人员至一层西广场候车区候车。", "崔扬/冯桦"],
    ["便携喇叭3号", "1F", 29, 76, "待命", "一层疏散组"],
    ["便携喇叭4号", "1F", 35, 76, "待命", "一层疏散组"],
  ] as const : minute >= 23 && minute < 26 ? [
    ["B8/B9候车区喇叭", "3F", 42, 21, "旅客朋友们，即将检票的列车为G1163、G651、G1878、G3168、G421、G6642、G7932、G7972，请乘坐以上车次的旅客随工作人员到1—2小时临时候车区等待。", "陈洋"],
    ["B4/B5候车区喇叭", "3F", 36, 24, "各位旅客请注意，G258、G51、G1165、G806、G652、G3148晚点两小时以上，请您到B4、B5检票口后方的2小时以上集结区等候。", "孙佳"],
    ["便携喇叭3号", "1F", 29, 76, "待命", "一层疏散组"],
    ["便携喇叭4号", "1F", 35, 76, "待命", "一层疏散组"],
  ] as const : minute >= 21 && minute < 23 ? [
    ["正南外宣传喇叭", "3F", 50, 30, "应急演练通知：旅客您好，因水害造成列车大面积晚点，郑州东站采取限时候车制度，请您于列车开车前两小时进入候车室，请两小时以外乘车的旅客前往一层西广场候车区听从工作人员安排统一候车。", "田心雨"],
    ["正南内侧宣传喇叭", "3F", 51, 29, "应急演练通知：各位旅客，请提前准备好您的身份证做好进站准备，持临时身份证的旅客由最左侧的人工验证口进行验证，有携带液体的旅客做好试喝准备，节省进站时间。", "田心雨"],
    ["便携喇叭3号", "1F", 29, 76, "待命", "一层疏散组"],
    ["便携喇叭4号", "1F", 35, 76, "待命", "一层疏散组"],
  ] as const : [
    ["便携喇叭1号", "3F", 50, 30, "待命", "进站口疏导组"],
    ["便携喇叭2号", "3F", 58, 13, "待命", "售票应急组"],
    ["便携喇叭3号", "1F", 29, 76, "待命", "一层疏散组"],
    ["便携喇叭4号", "1F", 35, 76, "待命", "一层疏散组"],
  ] as const
  const portableDevices = portableConfigs.map(([name, floor, x, y, detail, owner], index) => device(`BC_PORTABLE_${index + 1}`, name, "broadcast", floor, x, y, detail === "待命" ? "待机" : "正在播报", detail === "待命" ? "normal" : "active", detail, 1, name.replace("喇叭", "点位"), owner, minute >= 35 ? "09:35" : minute >= 32 ? "09:32" : minute >= 26 ? "09:26/09:29" : minute >= 23 ? "09:23" : minute >= 21 ? "09:21" : "09:05"))
  const allDevices: DeviceState[] = [
    device("GATE_SW", "西南进站通道", "gate", "3F", 18, 29, emergency ? "关闭/只出不进" : "开放", emergency ? "offline" : "normal", "关闭西南进站通道，引导两小时外旅客前往一层西广场候车区。", 1, "3F西南进站口", "宋衍斌/马瑞", "09:05/09:32"),
    device("GATE_NW", "西北进站通道", "gate", "3F", 19, 18, emergency ? "关闭" : "开放", emergency ? "offline" : "normal", "关闭西北进站通道并实施旅客分流。", 1, "3F西北进站口", "宋衍斌", "09:05"),
    device("GATE_S", "正南实名制核验闸机", "gate", "3F", 47, 31, emergency ? "限制两小时以外进站" : "开放", emergency ? "warning" : "normal", "只允许开车前两小时以内旅客进站。", 1, "3F正南进站口", "王瑞/田心雨", "09:05/09:21"),
    device("GATE_N", "正北实名制核验闸机", "gate", "3F", 72, 14, emergency ? "限制两小时以外进站" : "开放", emergency ? "warning" : "normal", "只允许开车前两小时以内旅客进站。", 1, "3F正北进站口", "王瑞", "09:05"),
    device("BC_32B", "32B检票口小区广播", "broadcast", "3F", 68, 18, activeBroadcast(17, 19) ? "循环播报" : "待机", activeBroadcast(17, 19) ? "critical" : "normal", "停运列车退票及B8/B9、B4/B5分区候车完整广播。", 1, "3F 32B检票口", "32B广播岗位", "09:17"),
    device("BC_SERVICE", "服务台大音响", "broadcast", "3F", 46, 29, activeBroadcast(19, 21) ? "人工宣传" : "待机", activeBroadcast(19, 21) ? "active" : "normal", "发布1—2小时、2小时以上候车分区及停运退票信息。", 1, "3F服务台", "宋君瑛", "09:19"),
    ...portableDevices,
    device("DSP_S", "正南进站大屏", "display", "3F", 53, 30, activeDisplay(19) ? "显示停运公告" : "车次信息", activeDisplay(19) ? "critical" : "normal", SCRIPT_REFUND_NOTICE, 1, "3F正南进站口", "文化传媒", "09:19"),
    device("DSP_N", "正北进站大屏", "display", "3F", 68, 13, activeDisplay(19) ? "显示停运公告" : "车次信息", activeDisplay(19) ? "critical" : "normal", SCRIPT_REFUND_NOTICE, 1, "3F正北进站口", "文化传媒", "09:19"),
    device("DSP_SERVICE", "服务台上方广告屏", "display", "3F", 49, 28, activeDisplay(19) ? "显示停运公告" : "普通广告", activeDisplay(19) ? "critical" : "normal", SCRIPT_REFUND_NOTICE, 1, "3F服务台上方", "文化传媒", "09:19"),
    device("DSP_TICKET", "第八售票处电子大屏", "display", "3F", 60, 12, activeDisplay(26) ? "显示退票公告" : "普通信息", activeDisplay(26) ? "critical" : "normal", SCRIPT_REFUND_NOTICE, 1, "3F第八售票处", "郭艳红", "09:26"),
    device("DSP_WEST", "一层西广场电子显示屏", "display", "1F", 31, 74, activeDisplay(5) ? (returning ? "显示分批进站指引" : "显示分区候车指引") : "待机", emergency ? "warning" : "normal", "显示候车分区、A/B检票口顺序及G806/G1808/G51进站指引。", 1, "1F西广场候车区", "程冠楠/信息员", "09:05/09:35"),
    device("WINDOW_5051", "50、51号退改签窗口", "window", "3F", 59, 13, minute >= 26 && minute < 47 ? "增开" : "关闭", minute >= 26 && minute < 47 ? "active" : "offline", "窗口上方显示“晚点、停运列车退票窗口”。", 2, "3F第八售票处", "郭艳红", "09:26"),
    device("DOOR_ELEVATOR", "2/3站台换乘直梯", "door", "2F", 50, 49, emergency ? "关闭" : "开放", emergency ? "offline" : "normal", "关闭后禁止站台换乘，旅客改走指定出站或疏散流线。", 1, "2F 2/3站台", "程冠楠", "09:05"),
    device("DOOR_WEST_PASS", "西广场疏散通道", "door", "1F", 22, 72, evacuating ? "单向疏散" : returning ? "双向组织" : "关闭", evacuating || returning ? "active" : "offline", "承担三层至一层西广场的下行疏散和后续分批回流。", 1, "1F西广场西侧", "程冠楠/张雯", "09:21/09:35"),
    device("DOOR_GREEN_L", "左侧绿色通道", "door", "1F", 25, 75, returning ? "快速进站" : "关闭", returning ? "active" : "offline", "供开车前半小时到达及G51等即将开检旅客快速进站。", 1, "1F西广场进站口左侧", "刘婉晴", "09:35"),
    device("DOOR_GREEN_R", "右侧绿色通道", "door", "1F", 35, 75, returning ? "快速进站" : "关闭", returning ? "active" : "offline", "供开车前半小时到达及G51等即将开检旅客快速进站。", 1, "1F西广场进站口右侧", "刘婉晴", "09:35"),
  ]

  return allDevices.map((item) => {
    const action = scriptStep.actions.find((candidate) => candidate.device.includes(item.name) || item.name.includes(candidate.device))
    return action ? { ...item, status: action.operation, detail: action.content ?? item.detail, owner: action.owner, scriptRef: scriptStep.time } : item
  })
}

export function getCurrentEvent(minute: number) {
  return [...events].reverse().find((event) => event.minute <= minute) ?? events[0]
}

export function formatSimulationTime(minute: number) {
  const total = SIMULATION_START + Math.round(minute)
  const hours = Math.floor(total / 60)
  const mins = total % 60
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`
}

export function densityTone(density: number) {
  if (density >= 0.85) return "critical"
  if (density >= 0.6) return "high"
  if (density >= 0.3) return "medium"
  return "low"
}
