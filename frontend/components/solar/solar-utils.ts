import type { SolarOverview } from "@/lib/solar-types"

/** Format a power value in Watts to a human-readable string (W / kW). */
export function formatPower(watts: number | null | undefined): string {
  if (watts === null || watts === undefined) return "—"
  const abs = Math.abs(watts)
  if (abs >= 1000) {
    return `${(watts / 1000).toFixed(2)} kW`
  }
  return `${Math.round(watts)} W`
}

/** Format a cumulative energy value in Wh to a human-readable string (Wh / kWh / MWh). */
export function formatEnergy(wh: number | null | undefined): string {
  if (wh === null || wh === undefined) return "—"
  const abs = Math.abs(wh)
  if (abs >= 1_000_000) {
    return `${(wh / 1_000_000).toFixed(2)} MWh`
  }
  if (abs >= 1000) {
    return `${(wh / 1000).toFixed(2)} kWh`
  }
  return `${Math.round(wh)} Wh`
}

/** Format a percentage value. */
export function formatPercent(pct: number | null | undefined): string {
  if (pct === null || pct === undefined) return "—"
  return `${Math.round(pct)}%`
}

export type FlowLeg =
  | "pvToHome"
  | "pvToGrid"
  | "gridToHome"
  | "batteryToHome"
  | "homeToBattery"

/**
 * Derive which power-flow legs are active and their magnitude (W) from a
 * normalized overview snapshot, following the API_GUIDE sign conventions:
 * - gridW: + = importing, - = exporting
 * - batteryW: + = charging, - = discharging
 */
export function deriveFlows(overview: SolarOverview): Record<FlowLeg, number> {
  const { solarW, gridW, batteryW } = overview.power
  const pv = solarW ?? 0
  const grid = gridW ?? 0
  const battery = batteryW ?? 0

  const importing = grid > 0 ? grid : 0
  const exporting = grid < 0 ? -grid : 0
  const charging = battery > 0 ? battery : 0
  const discharging = battery < 0 ? -battery : 0

  // PV feeds the home first, surplus goes to grid (export).
  const pvToGrid = Math.min(pv, exporting)
  const pvToHome = Math.max(pv - pvToGrid, 0)

  return {
    pvToHome,
    pvToGrid,
    gridToHome: importing,
    batteryToHome: discharging,
    homeToBattery: charging,
  }
}
