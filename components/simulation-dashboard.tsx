"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Activity,
  BellRing,
  Cctv,
  ChevronRight,
  CircleGauge,
  Clock3,
  Pause,
  Play,
  RotateCcw,
  ShieldAlert,
  TrainFront,
  Users,
} from "lucide-react"

import { StationOverviewMap } from "@/components/station-overview-map"
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

const speeds = [0.5, 1, 2, 5, 10]

function Metric({ icon, label, value, suffix, tone }: { icon: React.ReactNode; label: string; value: string; suffix?: string; tone?: string }) {
  return (
    <div className={`metric-card ${tone ? `metric-${tone}` : ""}`}>
      <div className="metric-icon">{icon}</div>
      <div><span>{label}</span><strong>{value}</strong>{suffix ? <small>{suffix}</small> : null}</div>
    </div>
  )
}

function severityLabel(severity: (typeof events)[number]["severity"]) {
  if (severity === "critical") return "关键"
  if (severity === "warning") return "关注"
  if (severity === "success") return "完成"
  return "信息"
}

export function SimulationDashboard() {
  const [minute, setMinute] = useState(5)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [selectedDevice, setSelectedDevice] = useState<DeviceState | null>(null)

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
  const hall = regions.find((region) => region.id === "hall")!
  const plaza = regions.find((region) => region.id === "plaza")!
  const activeDeviceCount = devices.filter((device) => device.tone !== "normal" && device.tone !== "offline").length
  const activeMonitorCount = minute >= 47 ? 0 : minute >= 29 ? 6 : minute >= 5 ? 5 : 0
  const total = regions.reduce((sum, region) => sum + region.count, 0)
  const progress = (minute / SIMULATION_DURATION) * 100

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
            <div><b>系统在线</b><small>三层综合态势版 v0.3.0</small></div>
          </div>
        </header>

        <section className="metric-grid" aria-label="关键态势指标">
          <Metric icon={<Users />} label="仿真总人数" value={total.toLocaleString()} suffix={` / ${TOTAL_PASSENGERS.toLocaleString()}`} />
          <Metric icon={<ShieldAlert />} label="候车厅人数" value={hall.count.toLocaleString()} suffix={` · ${Math.round(hall.density * 100)}%容量`} tone={hall.density >= 0.85 ? "critical" : "warning"} />
          <Metric icon={<Activity />} label="西广场候车" value={plaza.count.toLocaleString()} suffix={` · ${Math.round(plaza.density * 100)}%容量`} tone={plaza.density >= 0.6 ? "warning" : ""} />
          <Metric icon={<BellRing />} label="设备状态" value={`${activeDeviceCount}/${devices.length}`} suffix=" 激活/总量" />
          <Metric icon={<Cctv />} label="视频监控" value={`${activeMonitorCount}/6`} suffix=" 仿真画面" />
          <Metric icon={<Clock3 />} label="仿真时刻" value={formatSimulationTime(minute)} suffix={` · ${speed}×`} tone="time" />
        </section>

        <section className="workspace-grid">
          <aside className="event-panel">
            <div className="panel-heading"><div><span>EVENT TIMELINE</span><h2>应急事件链</h2></div><Badge variant="outline">15节点</Badge></div>
            <div className="event-list">
              {events.filter((event) => event.title !== "岗位到位与限流").map((event) => <button key={`${event.time}-${event.title}`} className={`event-row ${event.minute === currentEvent.minute ? "is-active" : ""} ${event.minute <= minute ? "is-passed" : ""}`} onClick={() => setMinute(event.minute)}><span className={`event-node severity-${event.severity}`} /><time>{event.time}</time><div><b>{event.title}</b><small>{event.location}</small></div><ChevronRight /></button>)}
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
              <span>{currentEvent.summary}</span>
              <div className="action-box"><CircleGauge /><p><b>系统动作</b>{currentEvent.action}</p></div>
            </div>
            <div className="device-summary">
              <div className="panel-heading compact"><div><span>DEVICE MATRIX</span><h2>设备总量及实时状态</h2></div><Badge variant="outline">总计 {devices.length}</Badge></div>
              {["gate", "broadcast", "display", "door", "sign"].map((type) => {
                const items = devices.filter((device) => device.type === type)
                const active = items.filter((device) => device.tone === "active" || device.tone === "critical" || device.tone === "warning").length
                const offline = items.filter((device) => device.tone === "offline").length
                const normal = items.length - active - offline
                const names: Record<string, string> = { gate: "闸机", broadcast: "广播", display: "信息屏", door: "疏散门", sign: "指示标识" }
                return (
                  <div className="device-summary-row" key={type}>
                    <span>{names[type]}<small>总 {items.length}</small></span>
                    <Progress value={(active / items.length) * 100} />
                    <b><i className="status-active">{active}激活</i><i className="status-normal">{normal}常规</i><i className="status-offline">{offline}关闭</i></b>
                  </div>
                )
              })}
            </div>
            <div className="device-live-feed">
              <div className="panel-heading compact"><div><span>LIVE DEVICE ACTIONS</span><h2>设备实时动作</h2></div><Badge variant="outline">{formatSimulationTime(minute)}</Badge></div>
              <div className="device-live-list">
                {devices.filter((device) => device.tone !== "normal").slice(0, 10).map((device) => <button key={device.id} type="button" className="device-live-row" onClick={() => setSelectedDevice(device)}><span className={`status-dot status-${device.tone}`} /><div><b>{device.name}</b><small>{device.floor} · {device.status} · {device.detail}</small></div></button>)}
              </div>
            </div>
            <div className="data-note">
              <b>数据口径</b>
              <p>三层底图来自所提供总体布局图；39个设备和6个监控点位使用归一化参考坐标。监控窗为仿真画面，接入真实视频后将按统一时钟替换。</p>
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

      <Dialog open={Boolean(selectedDevice)} onOpenChange={(open) => !open && setSelectedDevice(null)}>
        <DialogContent className="device-dialog">
          <DialogHeader>
            <DialogDescription>{selectedDevice?.id} · {selectedDevice?.floor}</DialogDescription>
            <DialogTitle>{selectedDevice?.name}</DialogTitle>
          </DialogHeader>
          <div className="dialog-status-row"><span>当前状态</span><Badge>{selectedDevice?.status}</Badge></div>
          <p>{selectedDevice?.detail}</p>
          <div className="dialog-audit"><b>状态审计</b><span>{formatSimulationTime(minute)} · 时间线自动触发 · 已写入回放快照</span></div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}
