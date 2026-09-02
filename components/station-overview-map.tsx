"use client"

import { useLayoutEffect, useMemo, useRef, useState } from "react"
import {
  Cctv,
  Compass,
  DoorOpen,
  Maximize2,
  Minimize2,
  Monitor,
  PanelTopClose,
  PanelTopOpen,
  Radio,
  RotateCcw,
  Route,
  ScanLine,
  Video,
  Wifi,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react"

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { createAgentSnapshot, densityColor, getCombinedBounds, type AgentPoint } from "@/lib/agent-density"
import { computeDynamicRoutes, routePointsToSvg, synchronizeAgentsWithRoutes, type DynamicRoute } from "@/lib/dynamic-routing"
import type { DeviceState, RegionState } from "@/lib/simulation"
import { formatSimulationTime } from "@/lib/simulation"

const monitors = [
  { id: "CAM-01", title: "西南疏散通道", subtitle: "西南路线人员流动与密度", x: 20, y: 29, start: 5, side: "left", slot: 1, regionIds: ["hall", "perimeter"] },
  { id: "CAM-02", title: "正南疏散通道", subtitle: "正南路线人员流动与密度", x: 52, y: 30.5, start: 5, side: "right", slot: 1, regionIds: ["hall", "gates"] },
  { id: "CAM-03", title: "正北疏散通道", subtitle: "正北路线人员流动与密度", x: 52, y: 14, start: 5, side: "left", slot: 2, regionIds: ["hall", "perimeter"] },
  { id: "CAM-04", title: "西北疏散通道", subtitle: "西北路线人员流动与密度", x: 19, y: 18, start: 5, side: "right", slot: 2, regionIds: ["hall", "perimeter"] },
  { id: "CAM-05", title: "二层换乘通道", subtitle: "四路客流下行汇合状态", x: 49, y: 50, start: 5, side: "left", slot: 3, regionIds: ["hall", "platform"] },
  { id: "CAM-06", title: "一层西广场", subtitle: "疏散到达人数与实时承接", x: 31, y: 76, start: 5, side: "right", slot: 3, regionIds: ["hall", "plaza"] },
] as const

const stationExits = [
  { id: "EXIT_N", label: "正北进站口", direction: "北", x: 52, y: 14 },
  { id: "EXIT_S", label: "正南进站口", direction: "南", x: 52, y: 30.5 },
  { id: "EXIT_SW", label: "西南进站口", direction: "西南", x: 20, y: 29 },
  { id: "EXIT_NW", label: "西北进站口", direction: "西北", x: 19, y: 18 },
] as const

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

const returnRouteColors = ["#00cc66", "#2ea043", "#00e676", "#4caf50"]

function getFlowMode(minute: number) {
  return minute >= 21 && minute < 35 ? "evacuation" : minute >= 35 && minute < 47 ? "return" : "standby"
}

export function DynamicRouteRecommendation({ minute, regions }: { minute: number; regions: RegionState[] }) {
  const dynamicRoutes = useMemo(() => computeDynamicRoutes(regions, minute), [regions, minute])
  const flowMode = getFlowMode(minute)

  return (
    <section className={`route-recommendation-panel flow-mode-${flowMode}`} aria-label="动态疏散与回流路径" data-route-engine="improved-a-star-manhattan-density">
      <header><div><Route /><span>{flowMode === "return" ? "回流路径" : "疏散路径推荐"}</span></div><b>{flowMode === "standby" ? "预计算待命" : "持续重算"}</b></header>
      <p>{flowMode === "return" ? "西广场 → 候车室 · 绿色回流箭头" : "候车室 → 西广场 · 改进型 A* 实时推荐"}</p>
      <div className="route-card-grid">
        {[...dynamicRoutes].sort((a, b) => a.score - b.score).map((route) => (
          <article key={route.id} className={route.recommended ? "is-recommended" : ""} style={{ "--route-color": flowMode === "return" ? returnRouteColors[dynamicRoutes.indexOf(route)] : route.color } as React.CSSProperties}>
            <span>{route.exit}{flowMode === "return" ? "回流线" : "疏散线"}{route.recommended ? <em>推荐</em> : null}</span>
            <strong>{route.distanceMeters}m · {route.estimatedMinutes}min</strong>
            <small>密度 {Math.round(route.density * 100)}% · 综合代价 {Math.round(route.score)}</small>
          </article>
        ))}
      </div>
      <footer>{flowMode === "return" ? "箭头由西广场指向候车室" : "箭头由候车室指向西广场"} · 最近重算 {formatSimulationTime(minute)}</footer>
    </section>
  )
}

function DeviceGlyph({ type }: { type: DeviceState["type"] }) {
  if (type === "broadcast") return <Radio />
  if (type === "display") return <Monitor />
  if (type === "door") return <DoorOpen />
  return <ScanLine />
}

function SimulatedMonitor({ monitor, minute, agents, regions, recommendedRoute }: { monitor: (typeof monitors)[number]; minute: number; agents: AgentPoint[]; regions: RegionState[]; recommendedRoute: DynamicRoute }) {
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
          <div className="monitor-caption"><strong>{monitor.title}</strong><span>{monitor.subtitle}</span><small>当前推荐：{recommendedRoute.exit} · 密度{Math.round(recommendedRoute.density * 100)}%</small></div>
          <div className="monitor-source"><Wifi /> 暂未接入真实视频流</div>
        </>
      ) : null}
    </article>
  )
}


function DraggableDeviceCallout({
  device,
  onClose,
  onSpeak,
}: {
  device: DeviceState
  onClose: () => void
  onSpeak: () => void
}) {
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const calloutRef = useRef<HTMLDivElement | null>(null)
  const dragOrigin = useRef<{
    pointerX: number
    pointerY: number
    offsetX: number
    offsetY: number
    minDx: number
    maxDx: number
    minDy: number
    maxDy: number
  } | null>(null)
  const anchorX = Math.max(14, Math.min(86, device.x))
  const anchorY = Math.max(7, Math.min(94, device.y))

  useLayoutEffect(() => {
    const callout = calloutRef.current
    const layer = callout?.parentElement
    if (!callout || !layer) return

    const containCallout = () => {
      const rect = callout.getBoundingClientRect()
      const bounds = layer.getBoundingClientRect()
      let dx = 0
      let dy = 0
      if (rect.left < bounds.left + 4) dx = bounds.left + 4 - rect.left
      if (rect.right > bounds.right - 4) dx = bounds.right - 4 - rect.right
      if (rect.top < bounds.top + 4) dy = bounds.top + 4 - rect.top
      if (rect.bottom > bounds.bottom - 4) dy = bounds.bottom - 4 - rect.bottom
      if (dx || dy) setOffset((current) => ({ x: current.x + dx, y: current.y + dy }))
    }

    containCallout()
    const observer = new ResizeObserver(containCallout)
    observer.observe(layer)
    window.addEventListener("resize", containCallout)
    return () => {
      observer.disconnect()
      window.removeEventListener("resize", containCallout)
    }
  }, [device.id, device.status])

  return (
    <div
      ref={calloutRef}
      className={`device-callout callout-${device.type}`}
      style={{ left: `${anchorX}%`, top: `${anchorY}%`, transform: `translate(-50%, -108%) translate3d(${offset.x}px, ${offset.y}px, 0)` }}
    >
      <div
        className="device-callout-titlebar"
        onPointerDown={(event) => {
          event.stopPropagation()
          const callout = event.currentTarget.parentElement
          const layer = callout?.parentElement
          if (!callout || !layer) return
          const rect = callout.getBoundingClientRect()
          const bounds = layer.getBoundingClientRect()
          dragOrigin.current = {
            pointerX: event.clientX,
            pointerY: event.clientY,
            offsetX: offset.x,
            offsetY: offset.y,
            minDx: bounds.left + 4 - rect.left,
            maxDx: bounds.right - 4 - rect.right,
            minDy: bounds.top + 4 - rect.top,
            maxDy: bounds.bottom - 4 - rect.bottom,
          }
          event.currentTarget.setPointerCapture(event.pointerId)
        }}
        onPointerMove={(event) => {
          if (!dragOrigin.current) return
          const dx = Math.max(dragOrigin.current.minDx, Math.min(dragOrigin.current.maxDx, event.clientX - dragOrigin.current.pointerX))
          const dy = Math.max(dragOrigin.current.minDy, Math.min(dragOrigin.current.maxDy, event.clientY - dragOrigin.current.pointerY))
          setOffset({ x: dragOrigin.current.offsetX + dx, y: dragOrigin.current.offsetY + dy })
        }}
        onPointerUp={(event) => {
          dragOrigin.current = null
          event.currentTarget.releasePointerCapture(event.pointerId)
        }}
        onPointerCancel={() => { dragOrigin.current = null }}
      >
        <span>{device.type === "broadcast" ? "广播播报" : "导向屏切换"} · 拖动</span>
        <button type="button" className="device-callout-close" aria-label={`关闭${device.name}提示`} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); onClose() }}><X /></button>
      </div>
      <button type="button" className="device-callout-body" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); onSpeak() }}>
        <b>{device.name}</b>
        <em>{device.floor} · {device.status}</em>
        <em>{device.detail}</em>
      </button>
    </div>
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
  const baseAgents = useMemo(() => createAgentSnapshot(regions, minute), [regions, minute])
  const dynamicRoutes = useMemo(() => computeDynamicRoutes(regions, minute), [regions, minute])
  const recommendedRoute = dynamicRoutes.find((route) => route.recommended) ?? dynamicRoutes[0]
  const agents = useMemo(() => synchronizeAgentsWithRoutes(baseAgents, dynamicRoutes, minute), [baseAgents, dynamicRoutes, minute])
  const floorTotals = floorLabelPositions.map((item) => ({
    ...item,
    count: regions.filter((region) => region.floor === item.floor).reduce((sum, region) => sum + region.count, 0),
  }))
  const boardingService = boardingServices.find((service) => minute >= service.start && minute < service.end)
  const boardingCount = boardingService
    ? Math.max(1, Math.min(boardingService.simulatedCapacity, Math.round(((minute - boardingService.start) / (boardingService.end - boardingService.start)) * boardingService.simulatedCapacity)))
    : 0
  const flowMode = getFlowMode(minute)
  const activeRoutes = flowMode === "standby" ? [] : dynamicRoutes.map((route, index) => ({
    ...route,
    renderId: `${flowMode}-${route.id}`,
    renderColor: flowMode === "return" ? returnRouteColors[index] : route.color,
    flowType: flowMode,
    points: flowMode === "return" ? [...route.points].reverse() : route.points,
  }))
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
  const [view, setView] = useState({ x: 0, y: 0, scale: 1.1 })
  const [isPanning, setIsPanning] = useState(false)
  const [monitorsOpen, setMonitorsOpen] = useState(false)
  const panOrigin = useRef<{ pointerX: number; pointerY: number; x: number; y: number } | null>(null)

  const changeScale = (delta: number) => {
    setView((current) => ({ ...current, scale: Math.min(1.45, Math.max(0.56, Number((current.scale + delta).toFixed(2)))) }))
  }

  const resetView = () => setView({ x: 0, y: 0, scale: 1.1 })

  return (
    <div
      className={`overview-map-stage ${isPanning ? "is-panning" : ""}`}
      onPointerDown={(event) => {
        const target = event.target as HTMLElement
        if (target.closest("button, .floating-monitor, .device-callout, .map-device-legend, .route-recommendation-panel")) return
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
        <div className="monitor-panel-heading"><Cctv /> 六路视频监控 · 底图/人员/路线同源同步</div>
        <div className="monitor-panel-grid">{monitors.map((monitor) => <SimulatedMonitor key={monitor.id} monitor={monitor} minute={minute} agents={agents} regions={regions} recommendedRoute={recommendedRoute} />)}</div>
      </div> : null}

      <div className="map-pan-layer" style={{ transform: `translate3d(calc(-50% + ${view.x}px), calc(-50% + ${view.y}px), 0) scale(${view.scale})` }}>
        <div className="map-crop-window">
          <div className="map-image-shell">
            <img src="/assets/zhengzhou-east-layout.png" alt="按深色演练界面风格重绘的郑州东站三层总体布局图，依次展示3F候车层、2F站台层和1F出站层" />
            <div className="map-dim-overlay" />
            <div className="map-compass" aria-label="底图方向：上北、下南、左西、右东"><Compass /><b>北</b><span className="east">东</span><span className="south">南</span><span className="west">西</span></div>
            <div className="station-exit-layer" aria-label="正南、正北、西南、西北四个进站口">
              {stationExits.map((exit) => <span key={exit.id} className={`station-exit station-exit-${exit.id.toLowerCase()}`} style={{ left: `${exit.x}%`, top: `${exit.y}%` }}><i>{exit.direction}</i>{exit.label}</span>)}
            </div>
            {flowMode !== "standby" ? <div className={`flow-direction-banner flow-${flowMode}`}><b>{flowMode === "return" ? "回流线" : "疏散线"}</b><span>{flowMode === "return" ? "西广场 → 候车室" : "候车室 → 西广场"}</span></div> : null}

            <svg className="route-overlay" viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="动态疏散与回流路线">
          <defs>
            {activeRoutes.map((route) => (
              <marker key={route.renderId} id={`arrow-${route.renderId}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto">
                <path d="M 0 0 L 10 5 L 0 10 z" fill={route.renderColor} />
              </marker>
            ))}
          </defs>
          {activeRoutes.map((route) => (
            <g key={route.renderId} className={`animated-route flow-${route.flowType} ${route.recommended ? "is-recommended" : ""}`}>
              <path d={routePointsToSvg(route.points)} stroke={route.renderColor} markerMid={`url(#arrow-${route.renderId})`} markerEnd={`url(#arrow-${route.renderId})`} />
              <path className="route-glow" d={routePointsToSvg(route.points)} stroke={route.renderColor} />
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
              {liveCallouts.filter((device) => reopenedCallout === `${device.id}-${device.status}` || !dismissedCallouts.has(`${device.id}-${device.status}`)).map((device) => (
                <DraggableDeviceCallout
                  key={`${device.id}-${device.status}`}
                  device={device}
                  onSpeak={() => speakCallout(device)}
                  onClose={() => { setReopenedCallout(null); setDismissedCallouts((current) => new Set(current).add(`${device.id}-${device.status}`)) }}
                />
              ))}
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
        <span><ScanLine />闸机</span><span><Radio />广播</span><span><Monitor />信息屏</span><span><DoorOpen />通道</span><span><Cctv />监控点</span>
        <span className="legend-evacuation">→ 疏散：候车室至西广场</span><span className="legend-return">→ 回流：西广场至候车室</span>
      </div>
    </div>
  )
}
