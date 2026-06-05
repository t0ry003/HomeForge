"use client"

import * as React from "react"
import { Sun, House, Zap, BatteryCharging, Gauge, Leaf } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import type { SolarOverview } from "@/lib/solar-types"
import { formatPower, formatPercent } from "./solar-utils"

interface StatProps {
  icon: React.ReactNode
  label: string
  value: string
  hint?: string
}

function Stat({ icon, label, value, hint }: StatProps) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-4">
        <div className="text-muted-foreground mt-0.5">{icon}</div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-semibold tabular-nums">{value}</p>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  )
}

export function SolarStatCards({ overview }: { overview: SolarOverview }) {
  const { power, battery, ratios } = overview
  const gridLabel =
    power.gridW === null
      ? "Grid"
      : power.gridW > 0
        ? "Grid (importing)"
        : power.gridW < 0
          ? "Grid (exporting)"
          : "Grid"

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <Stat
        icon={<Sun className="h-5 w-5" />}
        label="Production"
        value={formatPower(power.solarW)}
      />
      <Stat
        icon={<House className="h-5 w-5" />}
        label="Consumption"
        value={formatPower(power.loadW)}
      />
      <Stat
        icon={<Zap className="h-5 w-5" />}
        label={gridLabel}
        value={formatPower(power.gridW === null ? null : Math.abs(power.gridW))}
      />
      {battery.present && (
        <Stat
          icon={<BatteryCharging className="h-5 w-5" />}
          label="Battery"
          value={formatPercent(battery.socPct)}
          hint={formatPower(power.batteryW === null ? null : Math.abs(power.batteryW))}
        />
      )}
      <Stat
        icon={<Leaf className="h-5 w-5" />}
        label="Self-consumption"
        value={formatPercent(ratios.selfConsumptionPct)}
      />
      <Stat
        icon={<Gauge className="h-5 w-5" />}
        label="Autonomy"
        value={formatPercent(ratios.autonomyPct)}
      />
    </div>
  )
}
