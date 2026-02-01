"use client"

import React from 'react';
import { 
  Thermometer, 
  Droplets, 
  Activity, 
  Sun, 
  Wind
} from 'lucide-react';
import { cn } from "@/lib/utils";

interface SensorWidgetProps {
  value: number | boolean | null | undefined;
  label: string;
  unit?: string;
  isDisabled?: boolean;
  variant?: 'row' | 'square';
}

// Shared styling constants for consistency
const SQUARE_BASE = "relative flex flex-col items-center justify-center p-2 rounded-xl border transition-all aspect-square overflow-hidden";
const ROW_BASE = "flex items-center justify-between px-3 py-2 rounded-xl border transition-all h-14";
const ICON_WRAPPER = "p-1.5 rounded-lg shrink-0";
const ICON_SIZE = "w-4 h-4";
const VALUE_TEXT = "text-lg font-bold tabular-nums leading-none";
const LABEL_TEXT = "text-[9px] text-muted-foreground uppercase tracking-wider leading-none";
const UNIT_TEXT = "text-xs text-muted-foreground ml-0.5";
const STATUS_TEXT = "text-xs font-semibold uppercase tracking-wide";

// Temperature Sensor Display
export function TemperatureWidget({ 
  value, 
  label, 
  unit = '°C', 
  isDisabled,
  variant = 'row'
}: SensorWidgetProps) {
  const temp = typeof value === 'number' ? value : 0;
  const isHot = temp > 30;
  const isCold = temp < 15;
  
  const color = isCold ? 'text-blue-500' : isHot ? 'text-orange-500' : 'text-emerald-500';
  const bg = isCold ? 'bg-blue-500/10' : isHot ? 'bg-orange-500/10' : 'bg-emerald-500/10';
  const border = isCold ? 'border-blue-500/30' : isHot ? 'border-orange-500/30' : 'border-emerald-500/30';

  if (variant === 'square') {
    return (
      <div className={cn(SQUARE_BASE, bg, isDisabled ? 'opacity-50 border-border/50' : border, !isDisabled && 'hover:shadow-lg')}>
        <Thermometer className={cn(ICON_SIZE, "mb-1", color)} />
        <div className="flex items-baseline">
          <span className={cn(VALUE_TEXT, color)}>{temp.toFixed(1)}</span>
          <span className={UNIT_TEXT}>{unit}</span>
        </div>
        <span className={cn(LABEL_TEXT, "mt-1 text-center truncate w-full px-1")}>{label}</span>
      </div>
    );
  }

  return (
    <div className={cn(ROW_BASE, bg, isDisabled ? 'opacity-50 border-border/50' : border, !isDisabled && 'hover:shadow-md')}>
      <div className="flex items-center gap-3 min-w-0">
        <div className={cn(ICON_WRAPPER, bg)}>
          <Thermometer className={cn(ICON_SIZE, color)} />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-medium truncate">{label}</span>
          <span className={LABEL_TEXT}>Temperature</span>
        </div>
      </div>
      <div className="flex items-baseline shrink-0">
        <span className={cn(VALUE_TEXT, color)}>{temp.toFixed(1)}</span>
        <span className={UNIT_TEXT}>{unit}</span>
      </div>
    </div>
  );
}

// Humidity Sensor Display
export function HumidityWidget({ 
  value, 
  label, 
  unit = '%', 
  isDisabled,
  variant = 'row'
}: SensorWidgetProps) {
  const humidity = typeof value === 'number' ? value : 0;
  const isHigh = humidity > 70;
  const isLow = humidity < 30;
  
  const color = isLow ? 'text-amber-500' : isHigh ? 'text-blue-500' : 'text-cyan-500';
  const bg = isLow ? 'bg-amber-500/10' : isHigh ? 'bg-blue-500/10' : 'bg-cyan-500/10';
  const border = isLow ? 'border-amber-500/30' : isHigh ? 'border-blue-500/30' : 'border-cyan-500/30';

  if (variant === 'square') {
    return (
      <div className={cn(SQUARE_BASE, bg, isDisabled ? 'opacity-50 border-border/50' : border, !isDisabled && 'hover:shadow-lg')}>
        <Droplets className={cn(ICON_SIZE, "mb-1", color)} />
        <div className="flex items-baseline">
          <span className={cn(VALUE_TEXT, color)}>{humidity.toFixed(0)}</span>
          <span className={UNIT_TEXT}>{unit}</span>
        </div>
        <span className={cn(LABEL_TEXT, "mt-1 text-center truncate w-full px-1")}>{label}</span>
      </div>
    );
  }

  return (
    <div className={cn(ROW_BASE, bg, isDisabled ? 'opacity-50 border-border/50' : border, !isDisabled && 'hover:shadow-md')}>
      <div className="flex items-center gap-3 min-w-0">
        <div className={cn(ICON_WRAPPER, bg)}>
          <Droplets className={cn(ICON_SIZE, color)} />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-medium truncate">{label}</span>
          <span className={LABEL_TEXT}>Humidity</span>
        </div>
      </div>
      <div className="flex items-baseline shrink-0">
        <span className={cn(VALUE_TEXT, color)}>{humidity.toFixed(0)}</span>
        <span className={UNIT_TEXT}>{unit}</span>
      </div>
    </div>
  );
}

// Motion Sensor Display
export function MotionWidget({ 
  value, 
  label, 
  isDisabled,
  variant = 'row'
}: SensorWidgetProps) {
  const isMotionDetected = !!value;
  
  const color = isMotionDetected ? 'text-red-500' : 'text-muted-foreground';
  const bg = isMotionDetected ? 'bg-red-500/10' : 'bg-muted/10';
  const border = isMotionDetected ? 'border-red-500/30' : 'border-border/50';
  const shadow = isMotionDetected ? 'shadow-[0_0_12px_-3px_rgba(239,68,68,0.3)]' : '';

  if (variant === 'square') {
    return (
      <div className={cn(SQUARE_BASE, bg, border, shadow, isDisabled ? 'opacity-50' : '')}>
        {isMotionDetected && !isDisabled && (
          <div className="absolute inset-0 rounded-xl ring-2 ring-red-500/40 animate-pulse" />
        )}
        <div className={cn("relative", isMotionDetected && !isDisabled && "animate-pulse")}>
          <Activity className={cn("w-6 h-6", color)} />
        </div>
        <span className={cn(STATUS_TEXT, "mt-1", color, isMotionDetected && "animate-pulse")}>
          {isMotionDetected ? 'Active' : 'Clear'}
        </span>
      </div>
    );
  }

  return (
    <div className={cn(ROW_BASE, bg, border, shadow, isDisabled ? 'opacity-50' : '')}>
      <div className="flex items-center gap-3">
        <div className={cn(ICON_WRAPPER, bg, "relative")}>
          {isMotionDetected && !isDisabled && (
            <div className="absolute inset-0 rounded-lg bg-red-500/20 animate-ping" />
          )}
          <Activity className={cn(ICON_SIZE, "relative z-10", color)} />
        </div>
        <span className={LABEL_TEXT}>Motion</span>
      </div>
      <span className={cn(STATUS_TEXT, color, isMotionDetected && "animate-pulse")}>
        {isMotionDetected ? 'Active' : 'Clear'}
      </span>
    </div>
  );
}

// Light Sensor Display
export function LightWidget({ 
  value, 
  label, 
  unit = 'lux', 
  isDisabled,
  variant = 'row'
}: SensorWidgetProps) {
  const isBoolean = typeof value === 'boolean';
  const isLightOn = isBoolean ? value : (typeof value === 'number' && value > 100);
  const luxValue = typeof value === 'number' ? value : (value ? 500 : 0);
  
  const color = isLightOn ? 'text-yellow-500' : 'text-muted-foreground';
  const bg = isLightOn ? 'bg-yellow-500/10' : 'bg-muted/10';
  const border = isLightOn ? 'border-yellow-500/30' : 'border-border/50';

  if (variant === 'square') {
    return (
      <div className={cn(SQUARE_BASE, bg, isDisabled ? 'opacity-50 border-border/50' : border, !isDisabled && 'hover:shadow-lg')}>
        <Sun className={cn(ICON_SIZE, "mb-1", color)} />
        {isBoolean ? (
          <span className={cn(STATUS_TEXT, color)}>{isLightOn ? 'Bright' : 'Dark'}</span>
        ) : (
          <div className="flex items-baseline">
            <span className={cn(VALUE_TEXT, color)}>{luxValue.toFixed(0)}</span>
            <span className={UNIT_TEXT}>{unit}</span>
          </div>
        )}
        <span className={cn(LABEL_TEXT, "mt-1 text-center truncate w-full px-1")}>{label}</span>
      </div>
    );
  }

  return (
    <div className={cn(ROW_BASE, bg, isDisabled ? 'opacity-50 border-border/50' : border, !isDisabled && 'hover:shadow-md')}>
      <div className="flex items-center gap-3 min-w-0">
        <div className={cn(ICON_WRAPPER, bg)}>
          <Sun className={cn(ICON_SIZE, color)} />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-medium truncate">{label}</span>
          <span className={LABEL_TEXT}>Light</span>
        </div>
      </div>
      {isBoolean ? (
        <span className={cn(STATUS_TEXT, color)}>{isLightOn ? 'Bright' : 'Dark'}</span>
      ) : (
        <div className="flex items-baseline shrink-0">
          <span className={cn(VALUE_TEXT, color)}>{luxValue.toFixed(0)}</span>
          <span className={UNIT_TEXT}>{unit}</span>
        </div>
      )}
    </div>
  );
}

// CO2/Air Quality Sensor Display
export function CO2Widget({ 
  value, 
  label, 
  unit = 'ppm', 
  isDisabled,
  variant = 'row'
}: SensorWidgetProps) {
  const co2Value = typeof value === 'number' ? value : 400;
  
  const getQuality = () => {
    if (co2Value < 600) return { color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/30' };
    if (co2Value < 1000) return { color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' };
    if (co2Value < 1500) return { color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/30' };
    if (co2Value < 2500) return { color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/30' };
    return { color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/30' };
  };

  const { color, bg, border } = getQuality();

  if (variant === 'square') {
    return (
      <div className={cn(SQUARE_BASE, bg, isDisabled ? 'opacity-50 border-border/50' : border, !isDisabled && 'hover:shadow-lg')}>
        <Wind className={cn(ICON_SIZE, "mb-1", color)} />
        <div className="flex items-baseline">
          <span className={cn(VALUE_TEXT, color)}>{co2Value.toFixed(0)}</span>
          <span className={UNIT_TEXT}>{unit}</span>
        </div>
        <span className={cn(LABEL_TEXT, "mt-1 text-center truncate w-full px-1")}>{label}</span>
      </div>
    );
  }

  return (
    <div className={cn(ROW_BASE, bg, isDisabled ? 'opacity-50 border-border/50' : border, !isDisabled && 'hover:shadow-md')}>
      <div className="flex items-center gap-3 min-w-0">
        <div className={cn(ICON_WRAPPER, bg)}>
          <Wind className={cn(ICON_SIZE, color)} />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-medium truncate">{label}</span>
          <span className={LABEL_TEXT}>Air Quality</span>
        </div>
      </div>
      <div className="flex items-baseline shrink-0">
        <span className={cn(VALUE_TEXT, color)}>{co2Value.toFixed(0)}</span>
        <span className={UNIT_TEXT}>{unit}</span>
      </div>
    </div>
  );
}

// Export all widgets
export const SensorWidgets = {
  TEMPERATURE: TemperatureWidget,
  HUMIDITY: HumidityWidget,
  MOTION: MotionWidget,
  LIGHT: LightWidget,
  CO2: CO2Widget,
};
