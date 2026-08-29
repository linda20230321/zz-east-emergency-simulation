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
  type: "gate" | "broadcast" | "display" | "door" | "sign"
  floor: FloorId
  x: number
  y: number
  status: string
  tone: "normal" | "warning" | "critical" | "active" | "offline"
  detail: string
}

export const SIMULATION_START = 9 * 60
export const SIMULATION_DURATION = 47
export const TOTAL_PASSENGERS = 37000

export const events: SimulationEvent[] = [
  { minute: 0, time: "09:00", title: "演练背景", location: "生产指挥中心", summary: "京广高铁因水害中断，进入大面积晚点旅客滞留处置场景。", action: "加载37,000名旅客、68列晚点和6列停运的初始条件。", severity: "info" },
  { minute: 2, time: "09:02", title: "启动一级响应", location: "生产指挥中心", summary: "集团公司调度所下达I级应急响应命令。", action: "六个应急小组接令，系统记录响应启动事件。", severity: "critical" },
  { minute: 5, time: "09:05", title: "岗位到位与限流", location: "全站", summary: "应急人员到岗，西南/西北口关闭，南北主入口实施2小时限行。", action: "闸机、换乘直梯和疏散指示状态联动，路径网络重算。", severity: "critical" },
  { minute: 12, time: "09:12", title: "客运车间响应", location: "生产指挥中心", summary: "综控、售票、进站口、一层疏散、站台和服务台岗位完成部署。", action: "岗位态势更新为已到位。", severity: "warning" },
  { minute: 13, time: "09:13", title: "综控计划处置", location: "综控计划室", summary: "核对晚点、停运、接续列车和旅服系统数据。", action: "加载列车数据并形成接续疏散建议。", severity: "info" },
  { minute: 17, time: "09:17", title: "晚点广播", location: "32B检票口", summary: "循环播放致歉、停运退票和分区候车广播。", action: "广播设备进入自动播报，停运旅客获得退票与分流信息。", severity: "warning" },
  { minute: 19, time: "09:19", title: "停运信息发布", location: "服务台/南北进站口", summary: "进站大屏和服务台广告屏同步显示停运公告。", action: "信息屏切换应急模式，服务台进行人工解释。", severity: "warning" },
  { minute: 21, time: "09:21", title: "大规模疏散启动", location: "3F候车厅→1F西广场", summary: "两小时以外旅客沿主疏散路径转移至一层西广场。", action: "西广场通道单向开启，路径1全线标识点亮。", severity: "critical" },
  { minute: 23, time: "09:23", title: "候车分区组织", location: "B8-B9后方", summary: "启用1—2小时临时候车区与2小时以上集结区。", action: "隔离带和路径2支线生效，客流按车次分区。", severity: "warning" },
  { minute: 26, time: "09:26", title: "增开退改签窗口", location: "第八售票处", summary: "50、51号窗口增开并显示晚点、停运列车退票公告。", action: "退票流线激活，售票处客流增加。", severity: "info" },
  { minute: 29, time: "09:29", title: "高普联动", location: "B4-B5/西南落客平台", summary: "新乡、安阳方向旅客乘大巴转往郑州站接续普速列车。", action: "大巴与路径6高亮，组织旅客下行转运。", severity: "warning" },
  { minute: 32, time: "09:32", title: "西南口只出不进", location: "西南进站口", summary: "扶梯三层节点实施宣传和限流。", action: "指向西南口的进站标识关闭，疏散方向保持单向。", severity: "warning" },
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

function device(id: string, name: string, type: DeviceState["type"], floor: FloorId, x: number, y: number, status: string, tone: DeviceState["tone"], detail: string): DeviceState {
  return { id, name, type, floor, x, y, status, tone, detail }
}

export function getDevices(minute: number): DeviceState[] {
  const emergency = minute >= 5 && minute < 47
  const evacuating = minute >= 21 && minute < 35
  const returning = minute >= 35 && minute < 47
  const activeBroadcast = (start: number) => minute >= start && minute < 47
  const activeDisplay = (start: number) => minute >= start && minute < 47
  const signState = (id: string) => {
    const evacuationSigns = new Set([
      "SIGN_3F_HALL_S", "SIGN_3F_HALL_W1", "SIGN_3F_GATE_B4", "SIGN_3F_GATE_B5",
      "SIGN_3F_ESCALATOR_W", "SIGN_1F_WEST_ZONE_A", "SIGN_1F_WEST_ZONE_B",
    ])
    const holdingSigns = new Set(["SIGN_3F_GATE_B8", "SIGN_3F_GATE_B9"])
    const returnSigns = new Set([
      "SIGN_1F_WEST_GREEN_L", "SIGN_1F_WEST_GREEN_R", "SIGN_2F_ESCALATOR_UP", "SIGN_3F_HALL_S",
    ])
    const routineSigns = new Set([
      "SIGN_3F_HALL_N", "SIGN_3F_HALL_S", "SIGN_3F_ESCALATOR_S", "SIGN_2F_PLATFORM_E",
      "SIGN_2F_PLATFORM_W", "SIGN_2F_ESCALATOR_UP", "SIGN_2F_ESCALATOR_DOWN", "SIGN_1F_EXIT_N", "SIGN_1F_EXIT_S",
    ])
    if (returning && returnSigns.has(id)) return { status: "反向闪烁", tone: "active" as const }
    if (returning) return { status: routineSigns.has(id) ? "常规开启" : "关闭", tone: routineSigns.has(id) ? "normal" as const : "offline" as const }
    if (minute >= 32 && (id === "SIGN_3F_HALL_W1" || id === "SIGN_3F_HALL_W2")) return { status: "关闭", tone: "offline" as const }
    if (evacuating && evacuationSigns.has(id)) return { status: "疏散闪烁", tone: "active" as const }
    if (minute >= 23 && minute < 35 && holdingSigns.has(id)) return { status: "分区引导", tone: "warning" as const }
    if (emergency && evacuationSigns.has(id)) return { status: "应急开启", tone: "warning" as const }
    if (routineSigns.has(id)) return { status: "常规开启", tone: "normal" as const }
    return { status: "关闭", tone: "offline" as const }
  }

  const signs: Array<[string, string, FloorId, number, number]> = [
    ["SIGN_3F_HALL_N", "3F候车厅北侧通道标识", "3F", 49, 14],
    ["SIGN_3F_HALL_S", "3F候车厅南侧通道标识", "3F", 45, 27],
    ["SIGN_3F_HALL_W1", "3F候车厅西侧标识1", "3F", 26, 25],
    ["SIGN_3F_HALL_W2", "3F候车厅西侧标识2", "3F", 23, 18],
    ["SIGN_3F_GATE_B4", "B4检票口通道标识", "3F", 35, 24],
    ["SIGN_3F_GATE_B5", "B5检票口通道标识", "3F", 38, 23],
    ["SIGN_3F_GATE_B8", "B8检票口通道标识", "3F", 43, 21],
    ["SIGN_3F_GATE_B9", "B9检票口通道标识", "3F", 46, 20],
    ["SIGN_3F_ESCALATOR_S", "3F南侧扶梯口标识", "3F", 42, 30],
    ["SIGN_3F_ESCALATOR_W", "3F西侧扶梯口标识", "3F", 19, 29],
    ["SIGN_2F_PLATFORM_E", "2F站台东侧标识", "2F", 66, 48],
    ["SIGN_2F_PLATFORM_W", "2F站台西侧标识", "2F", 27, 49],
    ["SIGN_2F_ESCALATOR_UP", "2F上3F扶梯口标识", "2F", 69, 43],
    ["SIGN_2F_ESCALATOR_DOWN", "2F下1F扶梯口标识", "2F", 25, 45],
    ["SIGN_1F_WEST_ZONE_A", "1F西广场A区标识", "1F", 27, 77],
    ["SIGN_1F_WEST_ZONE_B", "1F西广场B区标识", "1F", 39, 77],
    ["SIGN_1F_WEST_GREEN_L", "1F西广场左侧绿色通道", "1F", 23, 72],
    ["SIGN_1F_WEST_GREEN_R", "1F西广场右侧绿色通道", "1F", 34, 72],
    ["SIGN_1F_EXIT_N", "1F北出站口通道", "1F", 50, 68],
    ["SIGN_1F_EXIT_S", "1F南出站口通道", "1F", 51, 79],
  ]

  const signDevices = signs.map(([id, name, floor, x, y]) => {
    const state = signState(id)
    return device(id, name, "sign", floor, x, y, state.status, state.tone, "状态与当前激活路径、闸机可用性和疏散方向保持一致。")
  })

  return [
    device("GATE_SW", "西南进站口闸机", "gate", "3F", 18, 29, emergency ? (returning ? "只出不进" : "关闭") : "开放", emergency ? "offline" : "normal", "9:05关闭；回流阶段保持只出不进。"),
    device("GATE_NW", "西北进站口闸机", "gate", "3F", 19, 18, emergency ? "关闭" : "开放", emergency ? "offline" : "normal", "应急阶段关闭并触发旅客重路由。"),
    device("GATE_S", "正南进站口闸机", "gate", "3F", 47, 31, evacuating ? "疏散模式" : emergency ? "2小时限行" : "开放", emergency ? "warning" : "normal", "限制两小时以外旅客进站。"),
    device("GATE_N", "正北进站口闸机", "gate", "3F", 72, 14, evacuating ? "疏散模式" : emergency ? "2小时限行" : "开放", emergency ? "warning" : "normal", "限制两小时以外旅客进站。"),
    device("BC_32B", "32B检票口广播", "broadcast", "3F", 68, 18, activeBroadcast(17) ? (minute < 21 ? "自动播报" : "应急宣传") : "待机", activeBroadcast(17) ? "critical" : "normal", "播放停运、退票和分区候车信息。"),
    device("BC_SERVICE", "服务台广播", "broadcast", "3F", 46, 29, activeBroadcast(19) ? "人工播报" : "待机", activeBroadcast(19) ? "active" : "normal", "服务台应急宣传与旅客解释。"),
    device("BC_GATE_S", "正南进站口喇叭", "broadcast", "3F", 50, 30, activeBroadcast(21) ? "限流宣传" : "待机", activeBroadcast(21) ? "active" : "normal", "宣传两小时限候和进站准备要求。"),
    device("BC_GATE_SW", "西南进站口喇叭", "broadcast", "3F", 20, 28, activeBroadcast(21) ? "限流宣传" : "待机", activeBroadcast(21) ? "active" : "normal", "宣传西南口只出不进和下行候车安排。"),
    device("BC_B8B9", "B8-B9后方广播", "broadcast", "3F", 40, 21, activeBroadcast(23) ? "分区宣传" : "待机", activeBroadcast(23) ? "active" : "normal", "引导1—2小时和2小时以上旅客分区。"),
    device("BC_WEST", "一层西广场广播", "broadcast", "1F", 29, 76, activeBroadcast(35) ? "回流宣传" : "待机", activeBroadcast(35) ? "active" : "normal", "按车次组织绿色通道分批回流。"),
    device("DSP_S", "正南进站大屏", "display", "3F", 53, 30, activeDisplay(19) ? "停运公告" : "车次信息", activeDisplay(19) ? "critical" : "normal", "同步发布停运和退票政策。"),
    device("DSP_N", "正北进站大屏", "display", "3F", 68, 13, activeDisplay(19) ? "停运公告" : "车次信息", activeDisplay(19) ? "critical" : "normal", "同步发布停运和退票政策。"),
    device("DSP_SERVICE", "服务台信息屏", "display", "3F", 49, 28, activeDisplay(19) ? "停运公告" : "车次信息", activeDisplay(19) ? "critical" : "normal", "服务台上方屏幕同步显示应急公告。"),
    device("DSP_TICKET", "第八售票处大屏", "display", "3F", 60, 12, activeDisplay(26) ? "退票公告" : "普通信息", activeDisplay(26) ? "critical" : "normal", "50/51号退改签窗口联动。"),
    device("DSP_WEST", "西广场引导屏", "display", "1F", 31, 74, activeDisplay(35) ? "回流路线" : "普通信息", activeDisplay(35) ? "warning" : "normal", "显示候车分区与回流路线。"),
    device("DOOR_ELEVATOR", "2/3站台换乘直梯", "door", "2F", 50, 49, emergency ? "关闭" : "开放", emergency ? "offline" : "normal", "关闭后旅客改走南北扶梯。"),
    device("DOOR_WEST_PASS", "西广场疏散通道", "door", "1F", 22, 72, evacuating ? "单向疏散" : returning ? "双向开放" : "关闭", evacuating || returning ? "active" : "offline", "9:21疏散开启，9:35回流后双向开放。"),
    device("DOOR_GREEN_L", "左侧绿色通道", "door", "1F", 25, 75, returning ? "只进不出" : "关闭", returning ? "active" : "offline", "回流阶段引导即将开检旅客快速进站。"),
    device("DOOR_GREEN_R", "右侧绿色通道", "door", "1F", 35, 75, returning ? "只进不出" : "关闭", returning ? "active" : "offline", "回流阶段引导即将开检旅客快速进站。"),
    ...signDevices,
  ]
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
