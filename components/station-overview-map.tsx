"use client"

import { useMemo, useRef, useState } from "react"
import {
  ArrowRightLeft,
  BusFront,
  Cctv,
  DoorOpen,
  Maximize2,
  Minimize2,
  Monitor,
  PanelTopClose,
  PanelTopOpen,
  Radio,
  RotateCcw,
  ScanLine,
  Video,
  Wifi,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react"

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { createAgentSnapshot, densityColor, getCombinedBounds, type AgentPoint } from "@/lib/agent-density"
import type { DeviceState, RegionState } from "@/lib/simulation"
import { formatSimulationTime } from "@/lib/simulation"

const monitors = [
  { id: "CAM-01", title: "西南/西北进站口", subtitle: "进站通道关闭与人员转向", x: 18, y: 25, start: 5, side: "left", slot: 1, regionIds: ["perimeter"] },
  { id: "CAM-02", title: "正南进站口", subtitle: "2小时限行与有序进站", x: 49, y: 30, start: 5, side: "right", slot: 1, regionIds: ["gates"] },
  { id: "CAM-03", title: "2/3站台换乘直梯", subtitle: "直梯关闭后扶梯分流", x: 50, y: 49, start: 5, side: "left", slot: 2, regionIds: ["platform"] },
  { id: "CAM-04", title: "2B/3B检票口", subtitle: "排队、分区候车与疏散", x: 34, y: 22, start: 5, side: "right", slot: 2, regionIds: ["gates", "hall"] },
  { id: "CAM-05", title: "西南落客平台大巴", subtitle: "大巴到位及高普联动旅客登车", x: 31, y: 80, start: 5, side: "left", slot: 3, regionIds: ["plaza"] },
  { id: "CAM-06", title: "西南落客平台应急通信车", subtitle: "通信保障车辆到位并开展保障", x: 22, y: 81, start: 5, side: "right", slot: 3, regionIds: ["plaza"] },
] as const

const routeDefinitions = [
  { id: "PATH_1", start: 21, end: 35, color: "#ff9e3d", points: "54,20 43,28 27,46 26,72" },
  { id: "PATH_2", start: 23, end: 35, color: "#ffd54f", points: "37,22 27,28 23,47 31,73" },
  { id: "PATH_5", start: 26, end: 47, color: "#d06dff", points: "48,20 58,14" },
  { id: "PATH_6", start: 29, end: 47, color: "#54c8ff", points: "36,22 21,30 29,81" },
  { id: "PATH_3", start: 35, end: 47, color: "#2fe09b", points: "27,74 27,50 45,29 50,20" },
  { id: "PATH_4", start: 35, end: 47, color: "#52f3c3", points: "35,75 36,52 49,31 55,21" },
]

const floorLabelPositions = [
  { floor: "3F", label: "候车层", x: 7.5, y: 23 },
  { floor: "2F", label: "站台层", x: 7.5, y: 50 },
  { floor: "1F", label: "出站层", x: 7.5, y: 76 },
] as const

const boardingServices = [
  { train: "G806", start: 38, end: 41, platform: "2道", destination: "北京西", simulatedCapacity: 850 },
  { train: "G1808", start: 41, end: 44, platform: "综控未指定", destination: "上海虹桥", simulatedCapacity: 800 },
  { train: "G51", start: 44, end: 47, platform: "综控未指定", destination: "重庆北", simulatedCapacity: 650 },
] as const

function DeviceGlyph({ type }: { type: DeviceState["type"] }) {
  if (type === "broadcast") return <Radio />
  if (type === "display") return <Monitor />
  if (type === "door") return <DoorOpen />
  if (type === "sign") return <ArrowRightLeft />
  if (type === "vehicle") return <BusFront />
  return <ScanLine />
}

function SimulatedMonitor({ monitor, minute, agents, regions }: { monitor: (typeof monitors)[number]; minute: number; agents: AgentPoint[]; regions: RegionState[] }) {
  const active = minute >= monitor.start && minute < 47
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [collapsed, setCollapsed] = useState(false)
  const dragOrigin = useRef<{ pointerX: number; pointerY: number; offsetX: number; offsetY: number } | null>(null)
  const sourceAgents = agents.filter((agent) => (monitor.regionIds as readonly string[]).includes(agent.regionId))
  const sampleStep = Math.max(1, Math.ceil(sourceAgents.length / 28))
  const monitorAgents = sourceAgents.filter((_, index) => index % sampleStep === 0).slice(0, 28)
  const bounds = getCombinedBounds([...monitor.regionIds])
  const synchronizedCount = regions.filter((region) => (monitor.regionIds as readonly string[]).includes(region.id)).reduce((sum, region) => sum + region.count, 0)

  return (
    <article
      className={`floating-monitor monitor-${monitor.side}-${monitor.slot} ${active ? "is-monitor-active" : ""} ${collapsed ? "is-monitor-collapsed" : ""}`}
      style={{ transform: `translate3d(${offset.x}px, ${offset.y}px, 0)` }}
    >
      <div
        className="monitor-titlebar"
        onPointerDown={(event) => {
          dragOrigin.current = { pointerX: event.clientX, pointerY: event.clientY, offsetX: offset.x, offsetY: offset.y }
          event.currentTarget.setPointerCapture(event.pointerId)
        }}
        onPointerMove={(event) => {
          if (!dragOrigin.current) return
          setOffset({
            x: dragOrigin.current.offsetX + event.clientX - dragOrigin.current.pointerX,
            y: dragOrigin.current.offsetY + event.clientY - dragOrigin.current.pointerY,
          })
        }}
        onPointerUp={(event) => {
          dragOrigin.current = null
          event.currentTarget.releasePointerCapture(event.pointerId)
        }}
      >
        <span><Video /> {monitor.id}</span>
        <button
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => setCollapsed((value) => !value)}
          aria-label={collapsed ? `展开${monitor.id}监控画面` : `收起${monitor.id}监控画面`}
        >
          {collapsed ? <Maximize2 /> : <Minimize2 />}
        </button>
      </div>
      {!collapsed ? (
        <>
          <div className="sim-feed">
            <div className="feed-geometry"><i /><i /><i /></div>
            {active ? monitorAgents.map((agent) => (
              <b key={agent.id} style={{ left: `${8 + ((agent.x - bounds.x) / Math.max(1, bounds.w)) * 84}%`, top: `${16 + ((agent.y - bounds.y) / Math.max(1, bounds.h)) * 67}%`, animationDelay: `${agent.delay}s`, background: densityColor(regions.find((region) => region.id === agent.regionId)?.density ?? 0) }} />
            )) : null}
            <span className="feed-clock">{formatSimulationTime(minute)} · SIM</span>
            <em>{active ? `同源同步 ${synchronizedCount.toLocaleString()}人` : "设备待触发"}</em>
          </div>
          <div className="monitor-caption"><strong>{monitor.title}</strong><span>{monitor.subtitle}</span></div>
          <div className="monitor-source"><Wifi /> 暂未接入真实视频流</div>
        </>
      ) : null}
    </article>
  )
}

export function StationOverviewMap({
  minute,
  regions,
  devices,
  onDeviceSelect,
}: {
  minute: number
  regions: RegionState[]
  devices: DeviceState[]
  onDeviceSelect: (device: DeviceState) => void
}) {
  const agents = useMemo(() => createAgentSnapshot(regions, minute), [regions, minute])
  const floorTotals = floorLabelPositions.map((item) => ({
    ...item,
    count: regions.filter((region) => region.floor === item.floor).reduce((sum, region) => sum + region.count, 0),
  }))
  const boardingService = boardingServices.find((service) => minute >= service.start && minute < service.end)
  const boardingCount = boardingService
    ? Math.max(1, Math.min(boardingService.simulatedCapacity, Math.round(((minute - boardingService.start) / (boardingService.end - boardingService.start)) * boardingService.simulatedCapacity)))
    : 0
  const activeRoutes = routeDefinitions.filter((route) => minute >= route.start && minute < route.end)
  const liveCallouts = devices.filter((device) => (device.type === "broadcast" || device.type === "display") && device.tone !== "normal" && device.tone !== "offline").filter((device, index, list) => list.findIndex((candidate) => candidate.type === device.type && candidate.floor === device.floor && candidate.x === device.x && candidate.y === device.y && candidate.detail === device.detail) === index)
  const [dismissedCallouts, setDismissedCallouts] = useState<Set<string>>(new Set())
  const [reopenedCallout, setReopenedCallout] = useState<string | null>(null)
  const speakCallout = (device: DeviceState) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(`${device.name}，${device.detail}`)
    utterance.lang = "zh-CN"
    utterance.rate = 0.95
    window.speechSynthesis.speak(utterance)
  }
  const [view, setView] = useState({ x: 0, y: 0, scale: 1 })
  const [isPanning, setIsPanning] = useState(false)
  const [monitorsOpen, setMonitorsOpen] = useState(false)
  const panOrigin = useRef<{ pointerX: number; pointerY: number; x: number; y: number } | null>(null)

  const changeScale = (delta: number) => {
    setView((current) => ({ ...current, scale: Math.min(1.45, Math.max(0.56, Number((current.scale + delta).toFixed(2)))) }))
  }

  const resetView = () => setView({ x: 0, y: 0, scale: 1 })

  return (
    <div
      className={`overview-map-stage ${isPanning ? "is-panning" : ""}`}
      onPointerDown={(event) => {
        const target = event.target as HTMLElement
        if (target.closest("button, .floating-monitor, .device-callout, .map-device-legend, .bus-indicator")) return
        panOrigin.current = { pointerX: event.clientX, pointerY: event.clientY, x: view.x, y: view.y }
        setIsPanning(true)
        event.currentTarget.setPointerCapture(event.pointerId)
      }}
      onPointerMove={(event) => {
        if (!panOrigin.current) return
        const nextX = panOrigin.current.x + event.clientX - panOrigin.current.pointerX
        const nextY = panOrigin.current.y + event.clientY - panOrigin.current.pointerY
        setView((current) => ({
          ...current,
          // Keep a generous portion of the map inside the viewport so panning
          // never exposes a full black frame at the edges.
          x: Math.max(-260, Math.min(260, nextX)),
          y: Math.max(-180, Math.min(180, nextY)),
        }))
      }}
      onPointerUp={(event) => {
        if (!panOrigin.current) return
        panOrigin.current = null
        setIsPanning(false)
        event.currentTarget.releasePointerCapture(event.pointerId)
      }}
      onPointerCancel={() => {
        panOrigin.current = null
        setIsPanning(false)
      }}
      onWheel={(event) => {
        event.preventDefault()
        const delta = event.deltaY > 0 ? -0.06 : 0.06
        setView((current) => ({
          ...current,
          scale: Math.min(1.45, Math.max(0.56, Number((current.scale + delta).toFixed(2)))),
        }))
      }}
    >
      <div className="map-view-controls" aria-label="总图视图控制">
        <button type="button" onClick={() => changeScale(0.1)} disabled={view.scale >= 1.45} aria-label="放大总图"><ZoomIn /></button>
        <span>{Math.round(view.scale * 100)}%</span>
        <button type="button" onClick={() => changeScale(-0.1)} disabled={view.scale <= 0.56} aria-label="缩小总图"><ZoomOut /></button>
        <button type="button" onClick={resetView} aria-label="复位总图位置"><RotateCcw /></button>
        <button type="button" className="monitor-panel-toggle" onClick={() => setMonitorsOpen((value) => !value)} aria-label={monitorsOpen ? "收起视频监控面板" : "展开视频监控面板"}>
          {monitorsOpen ? <PanelTopClose /> : <PanelTopOpen />}
          <b>{monitorsOpen ? "收起监控" : "展开监控"}</b>
        </button>
      </div>

      {monitorsOpen ? <div className="monitor-panel-dock" aria-label="六路视频监控面板">
        <div className="monitor-panel-heading"><Cctv /> 六路视频监控 · 同源Agent快照</div>
        <div className="monitor-panel-grid">{monitors.map((monitor) => <SimulatedMonitor key={monitor.id} monitor={monitor} minute={minute} agents={agents} regions={regions} />)}</div>
      </div> : null}

      <div className="map-pan-layer" style={{ transform: `translate3d(calc(-50% + ${view.x}px), calc(-50% + ${view.y}px), 0) scale(${view.scale})` }}>
        <div className="map-crop-window">
          <div className="map-image-shell">
            <img src="/assets/zhengzhou-east-layout.png" alt="按深色演练界面风格重绘的郑州东站三层总体布局图，依次展示3F候车层、2F站台层和1F出站层" />
            <div className="map-dim-overlay" />

            <svg className="route-overlay" viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="动态疏散与回流路线">
          <defs>
            {routeDefinitions.map((route) => (
              <marker key={route.id} id={`arrow-${route.id}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill={route.color} />
              </marker>
            ))}
          </defs>
          {activeRoutes.map((route) => (
            <g key={route.id} className="animated-route">
              <polyline points={route.points} stroke={route.color} markerEnd={`url(#arrow-${route.id})`} />
              <polyline className="route-glow" points={route.points} stroke={route.color} />
            </g>
          ))}
            </svg>

            <div className="global-passenger-layer" aria-label={`同源Agent聚合点 ${agents.length} 个，每点最多代表50人`}>
          {agents.map((agent) => (
            <i key={agent.id} className="overview-passenger" style={{ left: `${agent.x}%`, top: `${agent.y}%`, animationDelay: `${agent.delay}s`, background: densityColor(regions.find((region) => region.id === agent.regionId)?.density ?? 0), boxShadow: `0 0 4px ${densityColor(regions.find((region) => region.id === agent.regionId)?.density ?? 0)}` }} />
          ))}
            </div>

            <div className="floor-total-layer" aria-label="各楼层实时总人数">
              {floorTotals.map((item) => (
                <span key={item.floor} className={`floor-total-badge floor-${item.floor.toLowerCase()}`} style={{ left: `${item.x}%`, top: `${item.y}%` }}>
                  <b>{item.floor} · {item.label}</b>
                  <strong>{item.count.toLocaleString()}<small>人</small></strong>
                  <em>本层实时总人数</em>
                </span>
              ))}
            </div>

            {boardingService ? (
              <div className="platform-service-card" style={{ left: "51%", top: "49%" }} aria-label={`${boardingService.train}次列车站台乘车信息`}>
                <span>站台乘车联动</span>
                <div><b>{boardingService.train}</b><strong>开往 {boardingService.destination}</strong></div>
                <p><i /> 正在检票 · 旅客下站台</p>
                <dl><div><dt>站台</dt><dd>{boardingService.platform}</dd></div><div><dt>乘车人数</dt><dd>{boardingCount.toLocaleString()}人</dd></div></dl>
                <small>人数为同源客流模型实时仿真值</small>
              </div>
            ) : null}

            <div className="all-device-layer" aria-label="全部设备点位">
          {devices.map((device) => (
            <Tooltip key={device.id}>
              <TooltipTrigger
                className={`overview-device-marker device-${device.type} tone-${device.tone}`}
                style={{ left: `${device.x}%`, top: `${device.y}%` }}
                onClick={() => { onDeviceSelect(device); if (device.type === "broadcast" || device.type === "display") { setReopenedCallout(`${device.id}-${device.status}`); setDismissedCallouts((current) => { const next = new Set(current); next.delete(`${device.id}-${device.status}`); return next }) } }}
                aria-label={`${device.name}，状态：${device.status}`}
              >
                <DeviceGlyph type={device.type} />
                {device.tone !== "normal" && device.tone !== "offline" ? <span className="device-active-label">{device.status}</span> : null}
              </TooltipTrigger>
              <TooltipContent sideOffset={6}>{device.name} · {device.status}</TooltipContent>
            </Tooltip>
          ))}
            </div>
            <div className="device-callout-layer" aria-label="广播与导向屏实时提示">
              {liveCallouts.filter((device) => reopenedCallout === `${device.id}-${device.status}` || !dismissedCallouts.has(`${device.id}-${device.status}`)).map((device) => <div key={`${device.id}-${device.status}`} className={`device-callout callout-${device.type}`} style={{ left: `${device.x}%`, top: `${device.y}%` }}><button type="button" className="device-callout-close" aria-label={`关闭${device.name}提示`} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); setReopenedCallout(null); setDismissedCallouts((current) => new Set(current).add(`${device.id}-${device.status}`)) }}><X /></button><button type="button" className="device-callout-body" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); speakCallout(device) }}><b>{device.type === "broadcast" ? "广播播报" : "导向屏切换"}</b><span>{device.name}</span><em>{device.floor} · {device.status}</em><em>{device.detail}</em></button></div>)}
            </div>

            <div className="monitor-point-layer" aria-label="视频监控点位">
          {monitors.map((monitor) => (
            <Tooltip key={monitor.id}>
              <TooltipTrigger className="monitor-point" style={{ left: `${monitor.x}%`, top: `${monitor.y}%` }} aria-label={`${monitor.id} ${monitor.title}`} onClick={() => setMonitorsOpen(true)}>
                <Cctv />
              </TooltipTrigger>
              <TooltipContent sideOffset={6}>{monitor.id} · {monitor.title}</TooltipContent>
            </Tooltip>
          ))}
            </div>
          </div>
        </div>
      </div>

      <div className="map-device-legend">
        <span><ScanLine />闸机/系统</span><span><Radio />广播/对讲</span><span><Monitor />信息屏</span><span><DoorOpen />通道</span><span><ArrowRightLeft />标牌/隔离</span><span><BusFront />车辆</span><span><Cctv />监控点</span>
      </div>
      {minute >= 29 && minute < 47 ? <div className="bus-indicator"><BusFront /> 高普联动车辆已就位</div> : null}
    </div>
  )
}
