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
  label?: string
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
              : "border-dashed border-muted-foreground/25 bg-muted/40 text-muted-foreground/40"
          )}
        >
          {icon}
        </div>
        {(label || value) && (
          <div
            className={cn(
              "absolute flex flex-col items-center gap-0.5 whitespace-nowrap text-center",
              textPos === "top" ? "bottom-full mb-1.5" : "top-full mt-1.5"
            )}
          >
            {label && (
              <span className="text-[10px] font-medium text-muted-foreground sm:text-xs">
                {label}
              </span>
            )}
            {value && (
              <span
                className={cn(
                  "text-xs font-semibold tabular-nums sm:text-sm",
                  !active && "text-muted-foreground/50"
                )}
              >
                {value}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

interface FlowLineProps {
  /** the outer node endpoint [x,y] in 0-100 viewBox units */
  node: [number, number]
  active: boolean
  color: string
  /** when true the flow travels hub -> node, otherwise node -> hub */
  reverse?: boolean
}

const HUB: [number, number] = [50, 50]
const NODE_R = 8
const HUB_R = 10

/** Trim a segment so its ends stop at the circle edges instead of overlapping them. */
function trim(
  from: [number, number],
  to: [number, number],
  rFrom: number,
  rTo: number
): { x1: number; y1: number; x2: number; y2: number } {
  const [x1, y1] = from
  const [x2, y2] = to
  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.hypot(dx, dy) || 1
  const ux = dx / len
  const uy = dy / len
  return {
    x1: x1 + ux * rFrom,
    y1: y1 + uy * rFrom,
    x2: x2 - ux * rTo,
    y2: y2 - uy * rTo,
  }
}

function FlowLine({ node, active, color, reverse = false }: FlowLineProps) {
  // Direction of travel drives the dash animation; the geometry is always the
  // node<->hub segment, trimmed to each circle's edge so the dashes never bleed
  // into the icons.
  const from = reverse ? HUB : node
  const to = reverse ? node : HUB
  const rFrom = reverse ? HUB_R : NODE_R
  const rTo = reverse ? NODE_R : HUB_R
  const { x1, y1, x2, y2 } = trim(from, to, rFrom, rTo)
  return (
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      strokeWidth={1.6}
      strokeLinecap="round"
      stroke={active ? color : "var(--muted-foreground)"}
      strokeDasharray={active ? "3 4" : "0.5 4"}
      className={active ? "solar-flow-line" : "solar-flow-idle"}
    />
  )
}

const PV: [number, number] = [50, 16]
const GRID: [number, number] = [16, 50]
const HOME: [number, number] = [84, 50]
const BATTERY: [number, number] = [50, 84]

export function PowerFlowDiagram({ overview }: { overview: SolarOverview }) {
  const { power, battery, online } = overview

  // Treat anything below 1 W (in magnitude) as idle so near-zero readings
  // grey out the same way an exact 0 W does.
  const solarActive = (power.solarW ?? 0) >= 1
  const homeActive = (power.loadW ?? 0) >= 1
  const importing = (power.gridW ?? 0) >= 1
  const exporting = (power.gridW ?? 0) <= -1
  const charging = (power.batteryW ?? 0) >= 1
  const discharging = (power.batteryW ?? 0) <= -1
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
        /* Idle: round dots that gently breathe in place to signal "no flow". */
        .solar-flow-idle {
          stroke-linecap: round;
          animation: solar-idle-breathe 2.6s ease-in-out infinite;
        }
        @keyframes solar-idle-breathe {
          0%, 100% { opacity: 0.15; }
          50% { opacity: 0.45; }
        }
      `}</style>

      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* PV -> inverter (production) */}
        <FlowLine node={PV} active={solarActive} color="#f59e0b" />

        {/* Grid <-> inverter (import red / export emerald) */}
        <FlowLine
          node={GRID}
          active={importing || exporting}
          color={importing ? "#ef4444" : "#10b981"}
          reverse={exporting}
        />

        {/* inverter -> Home (consumption) */}
        <FlowLine node={HOME} active={homeActive} color="#3b82f6" reverse />

        {/* Battery <-> inverter (discharge emerald / charge violet) */}
        {showBattery && (
          <FlowLine
            node={BATTERY}
            active={charging || discharging}
            color={charging ? "#8b5cf6" : "#10b981"}
            reverse={charging}
          />
        )}
      </svg>

      {/* Inverter (center) */}
      <FlowNode
        x={HUB[0]}
        y={HUB[1]}
        hub
        icon={<CircuitBoard className="h-7 w-7 sm:h-8 sm:w-8" />}
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
