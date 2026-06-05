export type SolarProvider = 'fronius';

export type SolarMode =
  | 'bidirectional'
  | 'meter'
  | 'produce-only'
  | 'ac-coupled'
  | 'unknown';

export interface SolarCapabilities {
  history: boolean;
  battery: boolean;
  meter: boolean;
}

export interface SolarSystem {
  id: number;
  name: string;
  base_url: string;
  provider: SolarProvider;
  enabled: boolean;
  api_version: string;
  capabilities: SolarCapabilities;
  last_seen: string | null;
  created_at: string;
  updated_at: string;
}

export interface SolarPower {
  /** PV production, always >= 0 (W) */
  solarW: number | null;
  /** + = importing from grid, - = exporting (W) */
  gridW: number | null;
  /** House consumption, normalized positive (W) */
  loadW: number | null;
  /** + = charging, - = discharging (W) */
  batteryW: number | null;
}

export interface SolarBattery {
  present: boolean;
  socPct: number | null;
  mode: string | null;
  standby: boolean | null;
}

export interface SolarEnergy {
  /** Cumulative energy (Wh); any field may be null */
  todayWh: number | null;
  yearWh: number | null;
  totalWh: number | null;
}

export interface SolarRatios {
  selfConsumptionPct: number | null;
  autonomyPct: number | null;
}

export interface SolarStatus {
  code: number | null;
  message: string;
}

export interface SolarOverview {
  provider: SolarProvider;
  online: boolean;
  mode: SolarMode;
  timestamp: string | null;
  power: SolarPower;
  battery: SolarBattery;
  energy: SolarEnergy;
  ratios: SolarRatios;
  capabilities: SolarCapabilities;
  status: SolarStatus;
}
