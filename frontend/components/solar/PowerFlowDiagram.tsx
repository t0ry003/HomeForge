"use client"

import * as React from "react"
import { Sun, Zap, House, BatteryCharging } from "lucide-react"

import { cn } from "@/lib/utils"
import type { SolarOverview } from "@/lib/solar-types"
import { formatPower, formatPercent } from "./solar-utils"

interface NodeProps {
  x: number
  y: number
  icon: React.ReactNode
  label: string
  value: string
  accent: string
  active: boolean
}

function FlowNode({ x, y, icon, label, value, accent, active }: NodeProps) {
  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1 text-center"
      style={{ left: `${x}%`, top: `${y}%` }}
    >
      <div
        className={cn(
          "flex h-14 w-14 items-center justify-center rounded-full border-2 bg-card shadow-sm transition-colors",
          active ? accent : "border-muted text-muted-foreground"
        )}
      >
        {icon}
      </div>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold tabular-nums">{value}</span>
    </div>
  )
}

interface FlowLineProps {
  /** source point [x,y] in 0-100 viewBox units */
  from: [number, number]
  /** target point [x,y] in 0-100 viewBox units */
  to: [number, number]
  active: boolean
  color: string
}

function FlowLine({ from, to, active, color }: FlowLineProps) {
  const [x1, y1] = from
  const [x2, y2] = to
  return (
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      strokeWidth={1.4}
      strokeLinecap="round"
      stroke={active ? color : "var(--muted)"}
      strokeDasharray={active ? "3 4" : undefined}
      className={active ? "solar-flow-line" : undefined}
      opacity={active ? 1 : 0.4}
    />
  )
}

const HUB: [number, number] = [50, 50]
const PV: [number, number] = [50, 13]
const GRID: [number, number] = [13, 50]
const HOME: [number, number] = [87, 50]
const BATTERY: [number, number] = [50, 87]

export function PowerFlowDiagram({ overview }: { overview: SolarOverview }) {
  const { power, battery } = overview

  const solarActive = (power.solarW ?? 0) > 0
  const homeActive = (power.loadW ?? 0) > 0
  const importing = (power.gridW ?? 0) > 0
  const exporting = (power.gridW ?? 0) < 0
  const charging = (power.batteryW ?? 0) > 0
  const discharging = (power.batteryW ?? 0) < 0
  const showBattery = battery.present

  return (
    <div className="relative mx-auto aspect-square w-full max-w-md">
      <style>{`
        .solar-flow-line {
          animation: solar-dash 0.9s linear infinite;
        }
        @keyframes solar-dash {
          to { stroke-dashoffset: -14; }
        }
      `}</style>

      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* PV -> hub (production) */}
        <FlowLine from={PV} to={HUB} active={solarActive} color="#f59e0b" />

        {/* Grid <-> hub (import red / export emerald) */}
        <FlowLine
          from={importing ? GRID : HUB}
          to={importing ? HUB : GRID}
          active={importing || exporting}
          color={importing ? "#ef4444" : "#10b981"}
        />

        {/* hub -> Home (consumption) */}
        <FlowLine from={HUB} to={HOME} active={homeActive} color="#3b82f6" />

        {/* Battery <-> hub (discharge emerald / charge violet) */}
        {showBattery && (
          <FlowLine
            from={discharging ? BATTERY : HUB}
            to={discharging ? HUB : BATTERY}
            active={charging || discharging}
            color={discharging ? "#10b981" : "#8b5cf6"}
          />
        )}

        {/* central hub dot */}
        <circle cx={HUB[0]} cy={HUB[1]} r={2.2} fill="var(--primary)" />
      </svg>

      <FlowNode
        x={PV[0]}
        y={PV[1]}
        icon={<Sun className="h-6 w-6" />}
        label="Solar"
        value={formatPower(power.solarW)}
        accent="border-amber-500 text-amber-500"
        active={solarActive}
      />
      <FlowNode
        x={GRID[0]}
        y={GRID[1]}
        icon={<Zap className="h-6 w-6" />}
        label={exporting ? "Grid (export)" : "Grid"}
        value={formatPower(power.gridW === null ? null : Math.abs(power.gridW))}
        accent={
          importing
            ? "border-red-500 text-red-500"
            : "border-emerald-500 text-emerald-500"
        }
        active={importing || exporting}
      />
      <FlowNode
        x={HOME[0]}
        y={HOME[1]}
        icon={<House className="h-6 w-6" />}
        label="Home"
        value={formatPower(power.loadW)}
        accent="border-blue-500 text-blue-500"
        active={homeActive}
      />
      {showBattery && (
        <FlowNode
          x={BATTERY[0]}
          y={BATTERY[1]}
          icon={<BatteryCharging className="h-6 w-6" />}
          label={`Battery${
            battery.socPct !== null ? ` · ${formatPercent(battery.socPct)}` : ""
          }`}
          value={formatPower(power.batteryW === null ? null : Math.abs(power.batteryW))}
          accent={
            charging
              ? "border-violet-500 text-violet-500"
              : "border-emerald-500 text-emerald-500"
          }
          active={charging || discharging}
        />
      )}
    </div>
  )
}
