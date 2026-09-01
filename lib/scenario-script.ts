export type ScriptRole = { group: string; person: string; post: string; duty: string }
export type ScriptAction = { device: string; operation: string; content?: string; owner: string }

export type ScriptStep = {
  minute: number
  time: string
  title: string
  location: string
  process: string
  roles: ScriptRole[]
  actions: ScriptAction[]
  monitorIds?: string[]
}

const refundNotice = "应急演练公告：因水害原因造成列车停运，请已购买停运列车车次G7991、G804、G91、G77、G891、G1516车票的旅客，于30日内通过12306手机客户端或全国任意车站售票处免费办理退票手续，给您带来不便敬请谅解。（郑州东站）"
const twoHourNotice = "应急演练通知：旅客您好，因水害造成列车大面积晚点，郑州东站采取限时候车制度，请您于列车开车前两小时进入候车室，请两小时以外乘车的旅客前往一层西广场候车区听从工作人员安排统一候车。"

export const scriptSteps: ScriptStep[] = [
  { minute: 0, time: "09:00", title: "演练背景", location: "生产指挥中心", process: "加载京广高铁水害中断、68列晚点、6列停运和候车厅约37000名旅客的初始场景。", roles: [{ group: "生产指挥中心", person: "刘海涛", post: "生产指挥中心主任", duty: "接收调度命令并向站长报告" }], actions: [] },
  { minute: 2, time: "09:02", title: "启动Ⅰ级应急响应", location: "生产指挥中心", process: "集团公司调度所下达Ⅰ级响应命令，六个应急小组接令并到岗。", roles: [
    { group: "总指挥", person: "王留强", post: "郑州站站长", duty: "宣布启动Ⅰ级响应并指挥各应急小组" },
    { group: "客运组织组/路地联动组", person: "冯思润", post: "组长", duty: "组织旅客疏散及路地联动" },
    { group: "综合信息组", person: "高建生", post: "组长", duty: "统一发布晚点、停运及对外信息" },
    { group: "行车组织组", person: "李兴新", post: "组长", duty: "组织行车盯控与临客需求" },
    { group: "后勤保障组", person: "角振中", post: "组长", duty: "组织餐食、医疗及后勤保障" },
    { group: "站区协调组", person: "何冉", post: "组长", duty: "协调站区设备、公安、交警和志愿者" }
  ], actions: [{ device: "对讲机9部", operation: "启用", owner: "生产指挥中心" }] },
  { minute: 5, time: "09:05", title: "各应急小组到岗与设备联动", location: "全站", process: "六个应急小组逐项汇报到岗，完成进站限流、换乘直梯关闭、候车分区和路地联动资源布设。", roles: [
    { group: "客运组织组", person: "宋会超", post: "劳人科科长", duty: "组织15名帮班人员到达各站台，做好乘降、劝导、出站和重点旅客帮扶" },
    { group: "客运组织组", person: "闫林/吴丽媛", post: "客运车间主任/副主任", duty: "组织69名应急人员，统计37000名旅客、68列晚点和6列停运信息" },
    { group: "客运组织组", person: "宋衍斌/王瑞", post: "正南进站口负责人", duty: "关闭西南、西北进站通道，正南、正北实名制闸机限制两小时以外旅客进站" },
    { group: "客运组织组", person: "程冠楠/李予霞", post: "一层疏散/检票口负责人", duty: "关闭换乘直梯，布设引导牌和电子屏，组织1—2小时及2小时以上旅客分区" },
    { group: "站区协调组", person: "席宇/潘晓", post: "客运业务科/设备科", duty: "配备引导牌、喇叭、LED屏并保障电梯、安检及客服系统" },
    { group: "路地联动组", person: "地铁、公交、出租、交运、公安、通信、社会事业局、东站办、武警", post: "联动单位", duty: "限制到站客流，投放疏散车辆、通信车、医疗点、志愿者和警力" }
  ], actions: [
    { device: "西南/西北进站通道", operation: "关闭", owner: "宋衍斌" },
    { device: "正南/正北实名制核验闸机", operation: "设置2小时进站限制", owner: "王瑞" },
    { device: "2/3站台换乘直梯", operation: "关闭", owner: "程冠楠" },
    { device: "一层西广场48块引导牌及1块电子显示屏", operation: "布设到位", owner: "程冠楠/席宇" },
    { device: "西南落客平台大巴车", operation: "到位待命", owner: "交通运输集团" },
    { device: "西南落客平台应急通信车", operation: "开展通信保障", owner: "通信管理局" },
    { device: "一层西广场2个临时医疗点", operation: "启用", owner: "郑东新区社会事业局" }
  ], monitorIds: ["CAM-01", "CAM-02", "CAM-03", "CAM-04", "CAM-05", "CAM-06"] },
  { minute: 12, time: "09:12", title: "客运车间响应", location: "生产指挥中心", process: "客运车间启动Ⅰ级响应，综控、售票、进站口、一层疏散、站台和服务台岗位全部到位。", roles: [
    { group: "客运车间", person: "闫林", post: "主任", duty: "发布车间Ⅰ级响应和岗位点名" },
    { group: "客运应急小组", person: "李予霞", post: "负责人", duty: "候车厅滞留旅客分流、引流" },
    { group: "综控售票组", person: "吴丽媛", post: "负责人", duty: "统计晚点、接续列车并动态增开窗口" },
    { group: "进站口疏导组", person: "宋衍斌", post: "负责人", duty: "维护进站秩序" },
    { group: "一层疏散组", person: "程冠楠", post: "负责人", duty: "组织一层西广场候车区" },
    { group: "站台/服务台组", person: "梁苡菲/宋君瑛", post: "负责人", duty: "站台乘降及服务台解释" }
  ], actions: [{ device: "对讲机7部", operation: "岗位联络", owner: "客运车间" }] },
  { minute: 13, time: "09:13", title: "综控计划应急处置", location: "综控计划室", process: "核对旅服系统和CTC，维护晚点原退定义，统计接续需求并联系G1163次列车疏散100名旅客。", roles: [
    { group: "综控计划", person: "吴丽媛", post: "负责人", duty: "组织综控和计划按分工处置" },
    { group: "综控", person: "魏芳园", post: "指挥员", duty: "核对68列晚点、6列停运和旅服系统信息，联系G1163次列车长" },
    { group: "计划室", person: "郭杨", post: "计划员", duty: "维护晚点30分钟以上列车原退定义并形成统计表" }
  ], actions: [{ device: "旅服系统", operation: "更改8列晚点信息并保持与实际运行一致", owner: "魏芳园" }, { device: "12306原退系统", operation: "维护晚点30分钟以上列车原退定义", owner: "郭杨" }, { device: "广播系统", operation: "对晚点15分钟以上列车播放致歉广播", owner: "魏芳园" }] },
  { minute: 17, time: "09:17", title: "候车厅晚点广播", location: "32B检票口", process: "32B小区广播循环播放停运退票和分区候车信息。", roles: [{ group: "客运组织组", person: "32B广播岗位", post: "广播员", duty: "循环播放脚本指定文案" }], actions: [{ device: "32B检票口小区广播", operation: "循环播报", content: "应急演练通知：旅客们，您好，因水害导致列车运行受阻，部分列车停运。已购停运车次G7991、G804、G91、G77、G891、G1516的旅客可在30天内通过12306手机客户端，或全国任意车站免费办理退票手续，给您带来不便敬请谅解。请到新乡东、邯郸东、长沙南的旅客到B8、B9检票口排队候车，请持G258、G51、G1165、G806、G652、G3148车票的旅客至B4、B5检票口排队等候。", owner: "32B广播岗位" }] },
  { minute: 19, time: "09:19", title: "停运信息发布与服务台解释", location: "服务台/正南正北进站口", process: "三块大屏同步显示停运公告，服务台使用大音响进行旅客解释。", roles: [{ group: "服务台应急组", person: "宋君瑛", post: "服务台负责人", duty: "使用大音响发布分区候车、停运退票信息" }], actions: [
    { device: "正南进站大屏", operation: "切换停运公告", content: refundNotice, owner: "文化传媒/服务台" },
    { device: "正北进站大屏", operation: "切换停运公告", content: refundNotice, owner: "文化传媒/服务台" },
    { device: "服务台上方广告屏", operation: "切换停运公告", content: refundNotice, owner: "文化传媒/服务台" },
    { device: "服务台大音响", operation: "人工宣传", content: "应急演练通知：旅客们，您好，因水害导致列车运行受阻，请乘坐G1163、G651、G1878、G3168、G421、G6642、G7932、G7972前往B8、B9检票口后方的1—2小时临时候车区；停运车次旅客可在30天内免费退票；乘坐G258、G51、G1165、G806、G652、G3148的旅客请至B4、B5检票口后方的2小时以上集结区等候。", owner: "宋君瑛" }
  ] },
  { minute: 21, time: "09:21", title: "正南进站口限流疏散", location: "正南进站口→一层西广场", process: "正南、正北只允许两小时内旅客进站，两小时以外旅客转移至一层西广场。", roles: [
    { group: "进站口疏导组", person: "宋衍斌", post: "负责人", duty: "组织马瑞、田心雨实施进站分流和联控" },
    { group: "验证岗位", person: "马瑞/田心雨", post: "西南/正南验证值班员", duty: "摆放公告牌并引导两小时外旅客下行" }
  ], actions: [{ device: "正南外小喇叭", operation: "播放限时候车宣传", content: twoHourNotice, owner: "田心雨" }, { device: "正南公告牌", operation: "摆放并显示", content: "因水害影响，限两小时以内车次进站。", owner: "马瑞" }, { device: "正南内侧喇叭", operation: "播放进站准备提示", content: "各位旅客，请提前准备好您的身份证做好进站准备，持临时身份证的旅客由最左侧人工验证口验证，有携带液体的旅客做好试喝准备。", owner: "田心雨" }] },
  { minute: 23, time: "09:23", title: "1—2小时及2小时以上旅客分区", location: "B8/B9及B4/B5检票口后方", process: "客运员和志愿者按车次将旅客引导至两个临时候车区。", roles: [{ group: "客运组织组", person: "陈洋", post: "客运员", duty: "引导1—2小时内旅客至B8/B9后方" }, { group: "客运组织组", person: "孙佳", post: "客运员", duty: "引导2小时以上旅客至B4/B5后方" }], actions: [{ device: "1—2小时临时公告牌1个", operation: "启用", owner: "陈洋" }, { device: "隔离带20根", operation: "布设B8/B9候车区", owner: "客运组织组" }, { device: "2小时以上集结区标识", operation: "启用", content: "G258、G51、G1165、G806、G652、G3148旅客在此等候。", owner: "孙佳" }] },
  { minute: 26, time: "09:26", title: "第八售票处退改签组织", location: "第八售票处", process: "增开50、51号窗口，电子屏和手持喇叭同步发布退票改签信息。", roles: [{ group: "售票应急组", person: "郭艳红/任欣韫", post: "售票值班员/宣传员", duty: "增开窗口并解释退票改签政策" }], actions: [{ device: "50、51号售票窗口", operation: "打开并显示晚点、停运列车退票窗口", owner: "郭艳红" }, { device: "第八售票处电子大屏", operation: "显示停运退票公告", content: refundNotice, owner: "郭艳红" }, { device: "第八售票处手持喇叭", operation: "宣传退票改签和大巴接续", content: "已购买停运列车车票的旅客，可在30日内通过12306手机客户端或全国任意车站售票处免费办理退票手续。已购买晚点30分钟以上列车车票的旅客，可在列车实际发车时间前通过12306手机客户端免费办理退票手续。", owner: "任欣韫" }, { device: "退改签临时公告牌3个", operation: "布设", owner: "售票班组" }] },
  { minute: 29, time: "09:29", title: "高普联动与两小时以上旅客下行", location: "B4/B5→西南落客平台/一层西广场", process: "新乡、安阳方向旅客乘大巴转往郑州站，其余两小时以上旅客转移至一层西广场。", roles: [{ group: "检票口组织", person: "徐悦/崔扬/冯桦", post: "客运员/值班员", duty: "分别组织高普联动、下行候车及退票宣传" }], actions: [{ device: "西南落客平台大巴车", operation: "开始高普联运接驳", content: "前往新乡、安阳的旅客转乘大巴至郑州站，接续K600次普速列车。", owner: "徐悦" }, { device: "隔离带20根", operation: "布设B4/B5集结区", owner: "检票口组织" }, { device: "车次引导牌1个", operation: "启用", owner: "检票口组织" }], monitorIds: ["CAM-05"] },
  { minute: 32, time: "09:32", title: "西南进站口只出不进", location: "西南进站口及1F/2F/3F扶梯", process: "西南进站口保持只出不进，三层扶梯节点逐层宣传并限流。", roles: [{ group: "扶梯值守", person: "马瑞/蒋薇薇/梁苡菲", post: "3F/2F/1F西南扶梯值守", duty: "逐层宣传、限流并引导旅客前往一层西广场" }], actions: [{ device: "西南外公告牌", operation: "显示", content: "因水害影响，限两小时以内车次进站乘车。", owner: "马瑞" }, { device: "3F/2F/1F西南扶梯小喇叭", operation: "同步宣传", content: "旅客您好，因水害造成列车大面积晚点，郑州东站采取限时候车制度，请您凭当日当次车票于列车开车前两小时进入候车室，请持G258、G51、G1165、G806、G652、G3148车次的旅客前往一层西广场候车区进行候车。", owner: "马瑞/蒋薇薇/梁苡菲" }] },
  { minute: 35, time: "09:35", title: "一层西广场候车与分批回流", location: "一层西广场候车区", process: "南北分区候车，按G806、G1808、G51的开检状态分批经中部通道或绿色通道进站。", roles: [
    { group: "一层疏散组", person: "程冠楠/张雯", post: "负责人/值班员", duty: "组织南北分区候车和分批进站" },
    { group: "南北区", person: "陈颖/张琛", post: "区域负责人", duty: "维持候车秩序并进行宣传" },
    { group: "联控岗位", person: "刘婉晴/田心雨", post: "绿色通道/正南门值班员", duty: "与三层进站口联控并组织绿色通道进站" },
    { group: "带队岗位", person: "李静", post: "举牌带队人员", duty: "组织指定车次旅客进站" }
  ], actions: [
    { device: "一层西广场区域图4个", operation: "四角布设", owner: "一层疏散组" },
    { device: "区域导向牌30个", operation: "中通道布设", owner: "一层疏散组" },
    { device: "绿色通道宣传牌2个", operation: "启用", content: "开车前半小时到达的旅客可由两侧绿色通道快速进站。", owner: "刘婉晴" },
    { device: "手举车次牌60个", operation: "按车次动态使用", owner: "志愿者/带队人员" },
    { device: "隔离带200根", operation: "划分南北区及中部进站通道", owner: "张雯" },
    { device: "一层西广场电子显示屏", operation: "显示分区候车及G806/G1808/G51进站指引", content: "请按A、B检票口顺序和车次信息进入相应候车区域；G806、G1808、G51旅客按综控通知分批进站。", owner: "信息员" },
    { device: "二层平台宣传喇叭", operation: "基础候车宣传", content: "应急演练通知：旅客们，您好，目前由于候车厅限流，请您按A、B检票口顺序、车次信息找到您所乘坐列车的候车位置，并在相应候车区域耐心等候，听从工作人员指挥统一进站。开车前半小时到达的旅客可以直接从进口两侧的绿色通道快速进站。因水害原因G7991、G804、G91、G77、G891、G1516次列车停运，已购买停运列车车票的旅客，可在30日内通过12306手机客户端或全国任意车站售票处免费办理退票手续，给您带来的不便敬请谅解。", owner: "高山" },
    { device: "西广场外侧通道喇叭", operation: "基础候车宣传", content: "应急演练通知：旅客朋友们，请按车次牌信息找到您所乘坐列车的候车位置，并耐心等候，感谢您的配合。", owner: "张琛" },
    { device: "西广场候车区内喇叭", operation: "基础候车宣传", content: "应急演练通知：旅客朋友们，因水害造成列车大面积晚点，目前郑州东站采取限时候车制度，请您耐心在一层西广场候车区候车，听从工作人员指挥统一进站。", owner: "陈颖" },
    { device: "二层平台宣传喇叭", operation: "G806放行宣传", content: "应急演练通知：请乘坐G806次列车在候车区内的旅客听从工作人员指挥，到候车区中部通道排队等候进站；刚到达的旅客可根据指示标识从进站口两侧的绿色通道直接进站，请提前准备好身份证并取出行李中液体物品，以备安全检查，方便您快速进站乘车。", owner: "高山" },
    { device: "西广场中部通道喇叭", operation: "G806放行宣传", content: "应急演练通知：乘坐G806次列车的旅客可以进站乘车了，请听从工作人员指挥统一在一层西广场候车区中部排队进站，提前准备好身份证并取出行李中液体物品，以备安全检查，方便您快速进站乘车。", owner: "张雯" },
    { device: "G806手举车次牌", operation: "举牌带队至2道站台", content: "旅客朋友们，请跟我走。", owner: "李静" },
    { device: "二层平台宣传喇叭", operation: "G1808放行宣传", content: "应急演练通知：请乘坐G1808次列车在候车区内的旅客听从工作人员指挥在候车区中部排队进站。请提前准备好身份证并取出行李中液体物品，以备安全检查，方便您快速进站乘车。", owner: "高山" },
    { device: "西广场中部通道喇叭", operation: "G1808放行宣传", content: "应急演练通知：乘坐G1808次列车的旅客可以进站乘车了，请听从工作人员指挥统一在一层西广场候车区中部排队进站，提前准备好身份证并取出行李中液体物品，以备安全检查，方便您快速进站乘车。", owner: "张雯" },
    { device: "G1808手举车次牌", operation: "举牌带队进站", content: "旅客朋友们，请跟我走。", owner: "带队人员" },
    { device: "二层平台宣传喇叭", operation: "G51绿色通道宣传", content: "应急演练通知：G51次列车即将开检，请持G51次车票刚到达的旅客听从工作人员指引，从进站口两侧的绿色通道直接进站，请提前准备好身份证并取出行李中液体物品，以备安全检查，方便您快速进站乘车。", owner: "高山" },
    { device: "西广场中部通道喇叭", operation: "G51绿色通道宣传", content: "应急演练通知：乘坐G51次列车的旅客无需在此等待，可以从进站口两侧的绿色通道直接进站，提前准备好身份证并取出行李中液体物品，以备安全检查，方便您快速进站乘车。", owner: "张雯" },
    { device: "G51手举车次牌", operation: "经绿色通道举牌带队", content: "乘坐G51的旅客请跟我走。", owner: "绿色通道带队人员" }
  ] },
  { minute: 46, time: "09:46", title: "现场情况汇报", location: "二层平台", process: "候车厅旅客控制在约2万人，一层西广场秩序正常，客运车间向站级指挥报告。", roles: [{ group: "客运车间", person: "李予霞/程冠楠/闫林", post: "现场及车间负责人", duty: "报告候车厅和西广场疏散情况" }], actions: [{ device: "对讲机", operation: "现场情况汇报", owner: "闫林" }] },
  { minute: 47, time: "09:47", title: "响应结束", location: "生产指挥中心", process: "集团公司下达Ⅰ级响应结束命令，各小组转入善后处置并生成演练复盘记录。", roles: [{ group: "总指挥", person: "刘海涛/王留强", post: "生产指挥中心主任/站长", duty: "传达结束命令并组织善后" }], actions: [{ device: "全部应急设备", operation: "恢复常规状态并记录最终快照", owner: "各应急处置小组" }] }
]

export function getScriptStep(minute: number) {
  return [...scriptSteps].reverse().find((step) => step.minute <= minute) ?? scriptSteps[0]
}

export function getScriptRuntimeStep(minute: number): ScriptStep {
  const step = getScriptStep(minute)
  if (step.minute !== 35) return step

  const phase = minute < 38 ? "基础候车" : minute < 41 ? "G806" : minute < 44 ? "G1808" : "G51"
  const phaseTitles: Record<string, string> = {
    基础候车: "南北分区候车组织",
    G806: "G806经中部通道放行",
    G1808: "G1808经中部通道放行",
    G51: "G51经绿色通道反向进站",
  }
  const commonActions = step.actions.filter((action) => !["基础候车", "G806", "G1808", "G51"].some((key) => action.operation.includes(key)))
  const phaseActions = step.actions.filter((action) => action.operation.includes(phase))

  return {
    ...step,
    title: `${step.title} · ${phaseTitles[phase]}`,
    process: phase === "基础候车"
      ? "南北分区按A/B检票口和车次组织候车，绿色通道保持快速进站准备。"
      : phase === "G806"
        ? "综控通知G806停靠2道，二层与西广场同步宣传，李静举牌经中部通道带队进站。"
        : phase === "G1808"
          ? "候车厅约18000人，G1808正点放行，二层与西广场同步宣传并举牌带队进站。"
          : "G51即将开检，刚到站旅客不进入候车区，经两侧绿色通道从出站层反向进站。",
    actions: [...commonActions, ...phaseActions],
  }
}

export function getScriptAction(deviceName: string, minute: number) {
  const step = getScriptRuntimeStep(minute)
  return step.actions.find((action) => action.device.includes(deviceName) || deviceName.includes(action.device))
}
