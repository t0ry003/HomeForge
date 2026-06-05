"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart"
import type { SolarOverview } from "@/lib/solar-types"

const MAX_POINTS = 60

const chartConfig = {
  solar: { label: "Solar", color: "var(--chart-1)" },
  load: { label: "Home", color: "var(--chart-2)" },
  grid: { label: "Grid", color: "var(--chart-3)" },
} satisfies ChartConfig

interface Sample {
  time: string
  solar: number
  load: number
  grid: number
}

/**
 * Live, session-only power chart. Accumulates polled overview snapshots in
 * memory (the backend exposes no time-series history yet). Remount via a
 * `key` prop to reset when the active system changes.
 */
export function LivePowerChart({ overview }: { overview: SolarOverview }) {
  const [samples, setSamples] = React.useState<Sample[]>([])
  const lastStamp = React.useRef<string | null>(null)

  React.useEffect(() => {
    if (!overview.online) return
    const stamp = overview.timestamp ?? new Date().toISOString()
    if (stamp === lastStamp.current) return
    lastStamp.current = stamp

    const time = new Date(stamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
    setSamples((prev) => {
      const next = [
        ...prev,
        {
          time,
          solar: Math.round(overview.power.solarW ?? 0),
          load: Math.round(overview.power.loadW ?? 0),
          grid: Math.round(overview.power.gridW ?? 0),
        },
      ]
      return next.length > MAX_POINTS ? next.slice(next.length - MAX_POINTS) : next
    })
  }, [overview])

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle>Live power</CardTitle>
        <CardDescription>
          Data collected since this page was opened
        </CardDescription>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col">
        {samples.length < 2 ? (
          <div className="flex min-h-[220px] flex-1 items-center justify-center text-sm text-muted-foreground">
            Collecting live data…
          </div>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-full min-h-[220px] w-full flex-1"
          >
            <AreaChart data={samples} margin={{ left: 4, right: 4, top: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="time"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={44}
                tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} verticalAlign="top" />
              <defs>
                {(["solar", "load", "grid"] as const).map((key) => (
                  <linearGradient
                    key={key}
                    id={`fill-${key}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor={`var(--color-${key})`}
                      stopOpacity={0.4}
                    />
                    <stop
                      offset="95%"
                      stopColor={`var(--color-${key})`}
                      stopOpacity={0.05}
                    />
                  </linearGradient>
                ))}
              </defs>
              <Area
                dataKey="solar"
                type="monotone"
                stroke="var(--color-solar)"
                fill="url(#fill-solar)"
                isAnimationActive={false}
              />
              <Area
                dataKey="load"
                type="monotone"
                stroke="var(--color-load)"
                fill="url(#fill-load)"
                isAnimationActive={false}
              />
              <Area
                dataKey="grid"
                type="monotone"
                stroke="var(--color-grid)"
                fill="url(#fill-grid)"
                isAnimationActive={false}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
