"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  Activity,
  Ban,
  BellRing,
  ChevronRight,
  CircleGauge,
  Clock3,
  Focus,
  Pause,
  Play,
  RotateCcw,
  ShieldAlert,
  TrainFront,
  TrendingUp,
  Users,
} from "lucide-react"

import { DynamicRouteRecommendation, StationOverviewMap } from "@/components/station-overview-map"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { Slider } from "@/components/ui/slider"
import { TooltipProvider } from "@/components/ui/tooltip"
import {
  events,
  formatSimulationTime,
  getCurrentEvent,
  getDevices,
  getRegions,
  SIMULATION_DURATION,
  TOTAL_PASSENGERS,
  type DeviceState,
} from "@/lib/simulation"
import { getScriptRuntimeStep } from "@/lib/scenario-script"

const speeds = [0.5, 1, 2, 5, 10]
const focusEventMinutes = [5, 21, 23, 29, 32, 35]
const deviceTypeNames: Record<DeviceState["type"], string> = { gate: "闸机/通道", broadcast: "广播/喇叭", display: "显示屏", door: "直梯/通道", window: "售票窗口" }
const deviceTypeOrder = Object.keys(deviceTypeNames) as DeviceState["type"][]

function useAnimatedNumber(value: number) {
  const [display, setDisplay] = useState(value)
  const current = useRef(value)

  useEffect(() => {
    const from = current.current
    const startedAt = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / 360)
      const eased = 1 - Math.pow(1 - progress, 3)
      const next = from + (value - from) * eased
      current.current = next
      setDisplay(next)
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value])

  return Math.round(display)
}

function TrendLine({ values }: { values: number[] }) {
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = Math.max(1, max - min)
  const points = values.map((value, index) => `${(index / Math.max(1, values.length - 1)) * 62},${20 - ((value - min) / span) * 16}`).join(" ")
  return <svg className="metric-sparkline" viewBox="0 0 62 24" preserveAspectRatio="none" aria-hidden="true"><polyline points={points} /></svg>
}

function Metric({ icon, label, value, suffix, tone, delta, deltaPeriod = "分钟", series }: { icon: React.ReactNode; label: string; value: number | string; suffix?: string; tone?: string; delta?: number; deltaPeriod?: string; series?: number[] }) {
  const numericValue = typeof value === "number" ? value : 0
  const animatedValue = useAnimatedNumber(numericValue)
  const previous = useRef(numericValue)
  const [changing, setChanging] = useState(false)

  useEffect(() => {
    if (typeof value !== "number" || previous.current === value) return
    previous.current = value
    setChanging(true)
    const timer = window.setTimeout(() => setChanging(false), 430)
    return () => window.clearTimeout(timer)
  }, [value])

  return (
    <div className={`metric-card ${tone ? `metric-${tone}` : ""} ${changing ? "is-changing" : ""} ${series && series.length > 1 ? "has-series" : ""}`} aria-live="polite">
      <div className="metric-icon">{icon}</div>
      <div className="metric-copy">
        <span>{label}</span>
        <strong>{typeof value === "number" ? animatedValue.toLocaleString() : value}</strong>
        {suffix ? <small>{suffix}</small> : null}
        {delta !== undefined ? <em className={delta > 0 ? "trend-up" : delta < 0 ? "trend-down" : "trend-flat"}>{delta > 0 ? "▲" : delta < 0 ? "▼" : "—"} {delta === 0 ? "持平" : `${Math.abs(delta).toLocaleString()}/${deltaPeriod}`}</em> : null}
      </div>
      {series && series.length > 1 ? <TrendLine values={series} /> : null}
    </div>
  )
}

function getRegionCount(minute: number, id: string) {
  return getRegions(Math.max(0, Math.min(SIMULATION_DURATION, minute))).find((region) => region.id === id)?.count ?? 0
}

function getStationBacklog(minute: number) {
  return getRegions(Math.max(0, Math.min(SIMULATION_DURATION, minute)))
    .filter((region) => region.id !== "platform" && region.id !== "plaza")
    .reduce((sum, region) => sum + region.count, 0)
}

function buildSeries(minute: number, selector: (sampleMinute: number) => number) {
  return Array.from({ length: 12 }, (_, index) => selector(Math.max(0, minute - (11 - index) * 0.5)))
}

function severityLabel(severity: (typeof events)[number]["severity"]) {
  if (severity === "critical") return "关键"
  if (severity === "warning") return "关注"
  if (severity === "success") return "完成"
  return "信息"
}

function deviceMatchesAction(device: DeviceState, actionDevice: string) {
  if (device.name.includes(actionDevice) || actionDevice.includes(device.name)) return true
  const sharedPlace = ["正南外", "正南内", "正北", "西广场", "服务台", "32B", "第八售票处"]
    .some((place) => device.name.includes(place) && actionDevice.includes(place))
  if (!sharedPlace) return false
  const sameKind = [
    ["喇叭", "广播"],
    ["屏", "显示"],
    ["通道", "直梯"],
    ["窗口", "售票"],
  ].some((keywords) => keywords.some((keyword) => device.name.includes(keyword)) && keywords.some((keyword) => actionDevice.includes(keyword)))
  return sameKind
}

export function SimulationDashboard() {
  const [minute, setMinute] = useState(5)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [selectedDevice, setSelectedDevice] = useState<DeviceState | null>(null)
  const [stepFocusOpen, setStepFocusOpen] = useState(false)
  const autoFocusedMinute = useRef<number | null>(null)

  useEffect(() => {
    if (!playing) return
    const timer = window.setInterval(() => {
      setMinute((current) => {
        const next = current + 0.25 * speed
        if (next >= SIMULATION_DURATION) {
          setPlaying(false)
          return SIMULATION_DURATION
        }
        return next
      })
    }, 250)
    return () => window.clearInterval(timer)
  }, [playing, speed])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        event.preventDefault()
        setPlaying((value) => !value)
      }
      if (event.key.toLowerCase() === "r") {
        setMinute(0)
        setPlaying(false)
      }
      if (event.key === "ArrowLeft") setMinute((value) => Math.max(0, value - 1))
      if (event.key === "ArrowRight") setMinute((value) => Math.min(SIMULATION_DURATION, value + 1))
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const roundedMinute = Math.round(minute * 4) / 4
  const regions = useMemo(() => getRegions(roundedMinute), [roundedMinute])
  const devices = useMemo(() => getDevices(roundedMinute), [roundedMinute])
  const currentEvent = getCurrentEvent(roundedMinute)
  const scriptStep = getScriptRuntimeStep(roundedMinute)
  const focusDevices = devices.filter((device) => scriptStep.actions.some((action) => deviceMatchesAction(device, action.device)))
  useEffect(() => {
    if (!playing || !focusEventMinutes.includes(currentEvent.minute) || autoFocusedMinute.current === currentEvent.minute) return
    autoFocusedMinute.current = currentEvent.minute
    setPlaying(false)
    setStepFocusOpen(true)
  }, [currentEvent.minute, playing])
  const hall = regions.find((region) => region.id === "hall")!
  const plaza = regions.find((region) => region.id === "plaza")!
  const activeDeviceCount = devices.filter((device) => device.tone !== "normal" && device.tone !== "offline").reduce((sum, device) => sum + device.quantity, 0)
  const totalDeviceCount = devices.reduce((sum, device) => sum + device.quantity, 0)
  const activeMonitorCount = minute >= 47 ? 0 : minute >= 5 ? 6 : 0
  const total = regions.reduce((sum, region) => sum + region.count, 0)
  const stationBacklog = getStationBacklog(roundedMinute)
  const forecastBacklog = getStationBacklog(Math.min(SIMULATION_DURATION, roundedMinute + 10))
  const backlogDelta = stationBacklog - getStationBacklog(Math.max(0, roundedMinute - 1))
  const plazaDelta = plaza.count - getRegionCount(Math.max(0, roundedMinute - 1), "plaza")
  const backlogSeries = useMemo(() => buildSeries(roundedMinute, getStationBacklog), [roundedMinute])
  const plazaSeries = useMemo(() => buildSeries(roundedMinute, (sampleMinute) => getRegionCount(sampleMinute, "plaza")), [roundedMinute])
  const forecastSeries = useMemo(() => Array.from({ length: 12 }, (_, index) => getStationBacklog(Math.min(SIMULATION_DURATION, roundedMinute + index))), [roundedMinute])
  const progress = (minute / SIMULATION_DURATION) * 100
  const handleStepFocusOpenChange = (open: boolean) => {
    setStepFocusOpen(open)
    if (!open) {
      autoFocusedMinute.current = currentEvent.minute
      if (minute < SIMULATION_DURATION) setPlaying(true)
    }
  }

  return (
    <TooltipProvider>
      <main className="app-shell">
        <header className="topbar">
          <div className="brand-block">
            <div className="brand-mark"><TrainFront /></div>
            <div>
              <div className="eyebrow">ZHENGZHOU EAST · EMERGENCY DIGITAL TWIN</div>
              <h1>郑州东站应急疏散高保真仿真系统</h1>
            </div>
          </div>
          <div className="system-status">
            <span className="pulse-dot" />
            <div><b>系统在线</b><small>动态路径交付版 v0.8.1</small></div>
          </div>
        </header>

        <section className="metric-grid" aria-label="关键态势指标">
          <Metric icon={<Users />} label="全站客流总量" value={total} suffix={` / ${TOTAL_PASSENGERS.toLocaleString()}`} series={buildSeries(roundedMinute, () => TOTAL_PASSENGERS)} />
          <Metric icon={<TrendingUp />} label="10分钟站内积压预判" value={forecastBacklog} suffix=" 模型预测" delta={forecastBacklog - stationBacklog} deltaPeriod="10分钟" series={forecastSeries} tone={forecastBacklog > stationBacklog ? "critical" : "forecast"} />
          <Metric icon={<ShieldAlert />} label="站内实时积压人数" value={stationBacklog} suffix={` · 候车厅${hall.count.toLocaleString()}`} delta={backlogDelta} series={backlogSeries} tone={stationBacklog >= 30000 ? "critical" : "warning"} />
          <Metric icon={<Activity />} label="西广场承接人数" value={plaza.count} suffix={` · ${Math.round(plaza.density * 100)}%容量`} delta={plazaDelta} series={plazaSeries} tone={plaza.density >= 0.6 ? "warning" : ""} />
          <Metric icon={<TrainFront />} label="晚点列车" value={68} suffix={minute >= 13 ? " 已核实" : " 脚本预置"} tone="warning" />
          <Metric icon={<Ban />} label="停运列车" value={6} suffix=" G7991等" tone="critical" />
          <Metric icon={<BellRing />} label="激活设备" value={activeDeviceCount} suffix={` / ${totalDeviceCount} · 监控${activeMonitorCount}/6`} />
          <Metric icon={<Clock3 />} label="仿真时刻" value={formatSimulationTime(minute)} suffix={` · ${speed}×`} tone="time" />
        </section>

        <section className="workspace-grid">
          <aside className="event-panel">
            <div className="panel-heading"><div><span>EVENT TIMELINE</span><h2>应急事件链</h2></div><Badge variant="outline">15节点</Badge></div>
            <div className="event-list">
              {events.map((event) => <button key={`${event.time}-${event.title}`} className={`event-row ${event.minute === currentEvent.minute ? "is-active" : ""} ${event.minute <= minute ? "is-passed" : ""}`} onClick={() => { setMinute(event.minute); setPlaying(false); setStepFocusOpen(true) }}><span className={`event-node severity-${event.severity}`} /><time>{event.time}</time><div><b>{event.title}</b><small>{event.location}</small></div><ChevronRight /></button>)}
            </div>
          </aside>
          <section className="map-panel">
            <StationOverviewMap minute={minute} regions={regions} devices={devices} onDeviceSelect={setSelectedDevice} />
          </section>

          <aside className="insight-panel">
            <div className="current-time-block">
              <span>当前仿真时刻</span>
              <strong>{formatSimulationTime(minute)}</strong>
              <Badge className={`severity-badge severity-${currentEvent.severity}`}>{severityLabel(currentEvent.severity)}事件</Badge>
            </div>
            <div className="current-event-card">
              <p>{currentEvent.location}</p>
              <h2>{currentEvent.title}</h2>
              <span>{scriptStep.process}</span>
              <div className="action-box"><CircleGauge /><p><b>系统动作</b>{currentEvent.action}</p></div>
              <button type="button" className="open-step-focus" onClick={() => { setPlaying(false); setStepFocusOpen(true) }}><Focus /> 打开步骤聚焦视图</button>
            </div>
            <div className="device-summary">
              <div className="panel-heading compact"><div><span>DEVICE MATRIX</span><h2>设备总量及实时状态</h2></div><Badge variant="outline">总计 {totalDeviceCount}</Badge></div>
              {deviceTypeOrder.map((type) => {
                const items = devices.filter((device) => device.type === type)
                if (!items.length) return null
                const total = items.reduce((sum, device) => sum + device.quantity, 0)
                const active = items.filter((device) => device.tone === "active" || device.tone === "critical" || device.tone === "warning").reduce((sum, device) => sum + device.quantity, 0)
                const offline = items.filter((device) => device.tone === "offline").reduce((sum, device) => sum + device.quantity, 0)
                const normal = total - active - offline
                return (
                  <div className="device-summary-row" key={type}>
                    <span>{deviceTypeNames[type]}<small>总 {total}</small></span>
                    <Progress value={(active / total) * 100} />
                    <b><i className="status-active">{active}激活</i><i className="status-normal">{normal}常规</i><i className="status-offline">{offline}关闭</i></b>
                  </div>
                )
              })}
            </div>
            <details className="secondary-info-section">
              <summary><span>步骤、岗位与指令</span><small>{scriptStep.roles.length + scriptStep.actions.length}项 · 点击展开</small></summary>
              <div className="procedure-trace">
                <div className="trace-process"><b>{scriptStep.title}</b><span>{scriptStep.location}</span><p>{scriptStep.process}</p></div>
                <div className="trace-list">
                  {scriptStep.roles.map((role) => <div className="trace-row" key={`${role.person}-${role.post}`}><b>{role.person} · {role.post}</b><span>{role.group}｜{role.duty}</span></div>)}
                  {scriptStep.actions.map((action) => <div className="trace-row trace-action" key={`${action.device}-${action.operation}`}><b>{action.device} → {action.operation}</b><span>责任：{action.owner}{action.content ? `｜${action.content}` : ""}</span></div>)}
                </div>
              </div>
            </details>
            <details className="secondary-info-section">
              <summary><span>设备实时动作</span><small>{devices.filter((device) => device.tone !== "normal").length}项 · 点击展开</small></summary>
              <div className="device-live-feed">
                <div className="device-live-list">
                  {devices.filter((device) => device.tone !== "normal").slice(0, 10).map((device) => <button key={device.id} type="button" className="device-live-row" onClick={() => setSelectedDevice(device)}><span className={`status-dot status-${device.tone}`} /><div><b>{device.name}</b><small>{device.floor} · {device.status} · {device.detail}</small></div></button>)}
                </div>
              </div>
            </details>
            <div className="data-note">
              <b>数据口径</b>
              <p>设备数量、位置、状态、责任岗位、广播/屏显文案及6路监控均依据4.23演练脚本逐项映射；同一物资组以“点位+数量”方式呈现。</p>
            </div>
          </aside>
        </section>

        <section className="control-deck">
          <div className="play-controls">
            <Button size="icon" className="play-button" onClick={() => setPlaying((value) => !value)} aria-label={playing ? "暂停仿真" : "播放仿真"}>
              {playing ? <Pause /> : <Play />}
            </Button>
            <Button size="icon" variant="outline" onClick={() => { setMinute(0); setPlaying(false) }} aria-label="重置仿真"><RotateCcw /></Button>
          </div>
          <div className="timeline-control">
            <div className="timeline-labels"><span>09:00</span><b>{formatSimulationTime(minute)}</b><span>09:47</span></div>
            <div className="slider-wrap">
              <Slider min={0} max={SIMULATION_DURATION} step={0.25} value={[minute]} onValueChange={(value) => setMinute(value[0])} aria-label="仿真时间轴" />
              <div className="timeline-markers" aria-hidden="true">
                {events.map((event) => <i key={event.time} className={event.minute <= minute ? "passed" : ""} style={{ left: `${(event.minute / SIMULATION_DURATION) * 100}%` }} />)}
              </div>
            </div>
          </div>
          <div className="speed-controls" aria-label="播放倍速">
            <span>演示倍速</span>
            <div>{speeds.map((item) => <Button key={item} size="xs" variant={speed === item ? "default" : "ghost"} onClick={() => setSpeed(item)}>{item}×</Button>)}</div>
          </div>
          <div className="progress-readout"><span>流程进度</span><b>{Math.round(progress)}%</b></div>
        </section>
      </main>

      <Dialog open={stepFocusOpen} onOpenChange={handleStepFocusOpenChange}>
        <DialogContent className="step-focus-dialog">
          <DialogHeader>
            <DialogDescription>{scriptStep.time} · {scriptStep.location} · 步骤聚焦</DialogDescription>
            <DialogTitle>{scriptStep.title}</DialogTitle>
          </DialogHeader>
          <div className="step-focus-layout">
            <section className="step-focus-map" aria-label="当前步骤平面图">
              <StationOverviewMap minute={minute} regions={regions} devices={focusDevices} onDeviceSelect={setSelectedDevice} />
            </section>
            <aside className="step-focus-summary">
              <DynamicRouteRecommendation minute={roundedMinute} regions={regions} />
              <div className="focus-kpi-grid">
                <div><span>候车室</span><b>{hall.count.toLocaleString()}人</b></div>
                <div><span>西广场</span><b>{plaza.count.toLocaleString()}人</b></div>
                <div><span>关联设备</span><b>{focusDevices.length}个</b></div>
              </div>
              <div className="focus-process"><span>本步处置</span><p>{scriptStep.process}</p></div>
              <div className="focus-action-list">
                <span>设备与执行指令</span>
                {scriptStep.actions.length ? scriptStep.actions.map((action) => (
                  <button type="button" key={`${action.device}-${action.operation}`} onClick={() => {
                    const target = devices.find((device) => device.name.includes(action.device) || action.device.includes(device.name))
                    if (target) setSelectedDevice(target)
                  }}>
                    <b>{action.device}</b><em>{action.operation}</em><small>{action.owner}</small>
                  </button>
                )) : <p>本步骤无新增设备指令，保持当前联动状态。</p>}
              </div>
              <div className="focus-role-list"><span>关键岗位</span>{scriptStep.roles.slice(0, 4).map((role) => <p key={`${role.person}-${role.post}`}><b>{role.person} · {role.post}</b><small>{role.duty}</small></p>)}</div>
            </aside>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(selectedDevice)} onOpenChange={(open) => !open && setSelectedDevice(null)}>
        <DialogContent className="device-dialog">
          <DialogHeader>
            <DialogDescription>{selectedDevice?.id} · {selectedDevice?.floor}</DialogDescription>
            <DialogTitle>{selectedDevice?.name}</DialogTitle>
          </DialogHeader>
          <div className="dialog-status-row"><span>当前状态</span><Badge>{selectedDevice?.status}</Badge></div>
          <div className="dialog-device-meta"><span>安装位置：{selectedDevice?.location}</span><span>数量：{selectedDevice?.quantity}</span><span>责任岗位：{selectedDevice?.owner}</span><span>脚本节点：{selectedDevice?.scriptRef}</span></div>
          <p>{selectedDevice?.detail}</p>
          <div className="dialog-audit"><b>状态审计</b><span>{formatSimulationTime(minute)} · 时间线自动触发 · 已写入回放快照</span></div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}
