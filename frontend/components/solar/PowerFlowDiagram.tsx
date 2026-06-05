"use client"

import * as React from "react"
import { Sun, Zap, House, BatteryCharging, CircuitBoard } from "lucide-react"

import { cn } from "@/lib/utils"
import type { SolarOverview } from "@/lib/solar-types"
import { formatPower, formatPercent } from "./solar-utils"

type TextPos = "top" | "bottom"

interface NodeProps {
  x: number
  y: number
  icon: React.ReactNode
  label: string
  value?: string
  accent: string
  active: boolean
  textPos?: TextPos
  hub?: boolean
}

function FlowNode({
  x,
  y,
  icon,
  label,
  value,
  accent,
  active,
  textPos = "bottom",
  hub = false,
}: NodeProps) {
  return (
    <div
      className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${x}%`, top: `${y}%` }}
    >
      <div className="relative flex items-center justify-center">
        <div
          className={cn(
            "flex items-center justify-center rounded-full border-2 bg-card shadow-sm transition-all duration-500",
            hub
              ? "h-16 w-16 sm:h-[4.5rem] sm:w-[4.5rem]"
              : "h-12 w-12 sm:h-14 sm:w-14",
            active
              ? accent
              : "border-muted text-muted-foreground opacity-40 grayscale"
          )}
        >
          {icon}
        </div>
        <div
          className={cn(
            "absolute flex flex-col items-center gap-0.5 whitespace-nowrap text-center",
            textPos === "top" ? "bottom-full mb-1.5" : "top-full mt-1.5"
          )}
        >
          <span className="text-[10px] font-medium text-muted-foreground sm:text-xs">
            {label}
          </span>
          {value && (
            <span className="text-xs font-semibold tabular-nums sm:text-sm">
              {value}
            </span>
          )}
        </div>
      </div>
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
      strokeWidth={1.6}
      strokeLinecap="round"
      stroke={active ? color : "var(--muted-foreground)"}
      strokeDasharray="3 4"
      className={active ? "solar-flow-line" : "solar-flow-idle"}
    />
  )
}

const HUB: [number, number] = [50, 50]
const PV: [number, number] = [50, 16]
const GRID: [number, number] = [16, 50]
const HOME: [number, number] = [84, 50]
const BATTERY: [number, number] = [50, 84]

export function PowerFlowDiagram({ overview }: { overview: SolarOverview }) {
  const { power, battery, online } = overview

  const solarActive = (power.solarW ?? 0) > 0
  const homeActive = (power.loadW ?? 0) > 0
  const importing = (power.gridW ?? 0) > 0
  const exporting = (power.gridW ?? 0) < 0
  const charging = (power.batteryW ?? 0) > 0
  const discharging = (power.batteryW ?? 0) < 0
  const showBattery = battery.present

  return (
    <div className="relative mx-auto aspect-square w-full max-w-sm sm:max-w-md">
      <style>{`
        .solar-flow-line {
          animation: solar-dash 0.9s linear infinite;
        }
        @keyframes solar-dash {
          to { stroke-dashoffset: -14; }
        }
        .solar-flow-idle {
          opacity: 0.3;
          animation: solar-idle-pulse 2.4s ease-in-out infinite;
        }
        @keyframes solar-idle-pulse {
          0%, 100% { opacity: 0.18; }
          50% { opacity: 0.4; }
        }
      `}</style>

      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* PV -> inverter (production) */}
        <FlowLine from={PV} to={HUB} active={solarActive} color="#f59e0b" />

        {/* Grid <-> inverter (import red / export emerald) */}
        <FlowLine
          from={importing ? GRID : HUB}
          to={importing ? HUB : GRID}
          active={importing || exporting}
          color={importing ? "#ef4444" : "#10b981"}
        />

        {/* inverter -> Home (consumption) */}
        <FlowLine from={HUB} to={HOME} active={homeActive} color="#3b82f6" />

        {/* Battery <-> inverter (discharge emerald / charge violet) */}
        {showBattery && (
          <FlowLine
            from={discharging ? BATTERY : HUB}
            to={discharging ? HUB : BATTERY}
            active={charging || discharging}
            color={discharging ? "#10b981" : "#8b5cf6"}
          />
        )}
      </svg>

      {/* Inverter (center) */}
      <FlowNode
        x={HUB[0]}
        y={HUB[1]}
        hub
        icon={<CircuitBoard className="h-7 w-7 sm:h-8 sm:w-8" />}
        label="Inverter"
        accent="border-primary text-primary"
        active={online}
      />

      <FlowNode
        x={PV[0]}
        y={PV[1]}
        textPos="top"
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
