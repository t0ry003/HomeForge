"use client"

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { 
  Cpu, 
  Power,
  SlidersHorizontal,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { getIconComponent } from "@/lib/icons";
import { updateDeviceState } from "@/lib/apiClient";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { 
  TemperatureWidget, 
  HumidityWidget, 
  MotionWidget, 
  LightWidget, 
  CO2Widget 
} from "./SensorWidgets";

interface Control {
  widget_type: 'TOGGLE' | 'SLIDER' | 'GAUGE' | 'BUTTON' | 'TEMPERATURE' | 'HUMIDITY' | 'MOTION' | 'LIGHT' | 'CO2' | 'PRESSURE' | 'POWER' | 'BATTERY' | 'STATUS';
  label: string;
  variable_mapping: string;
  min_value?: number | null;
  max_value?: number | null;
  step?: number | null;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'row' | 'square' | 'compact';
  unit?: string;
}

interface LayoutConfig {
  w?: number;         // Backend format (width)
  h?: number;         // Backend format (height)  
  columns?: number;   // Frontend format
  gap?: 'sm' | 'md' | 'lg';
}

interface SmartDeviceCardProps {
  device: any;
  deviceType: any;
  roomName?: string;
  roomIcon?: string;
  readOnly?: boolean;
  animationIndex?: number;
}

// Check if this is a simple single-toggle device (ONLY has one toggle, nothing else)
function isSingleToggleDevice(controls: Control[]): boolean {
  const toggles = controls.filter(c => c.widget_type === 'TOGGLE');
  // A single-toggle device has exactly 1 toggle and no other controls at all
  return toggles.length === 1 && controls.length === 1;
}

// Get all toggles for tap-to-toggle behavior
function getToggleControls(controls: Control[]): Control[] {
  return controls.filter(c => c.widget_type === 'TOGGLE');
}

export default function SmartDeviceCard({ device, deviceType, roomName, roomIcon, readOnly = false, animationIndex }: SmartDeviceCardProps) {
  const [currentState, setCurrentState] = useState<any>(device.current_state || {});
  // Use a local online state that can be optimistic
  const [isOnline, setIsOnline] = useState(device.status === 'online' || device.is_online);
  // Track if we are in a local optimistic state (either debouncing or mutating)
  const [isDebouncing, setIsDebouncing] = useState(false);
  // Track if we are waiting for a refetch after mutation
  const [isRefetching, setIsRefetching] = useState(false);
  
  const queryClient = useQueryClient();
  
  const updateMutation = useMutation({
    mutationFn: async ({ id, newState }: { id: string; newState: any }) => {
      // Direct call, no artificial delays
      return updateDeviceState(id, newState);
    },
    onMutate: async ({ id, newState }) => {
        // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
        await queryClient.cancelQueries({ queryKey: ['devices'] });
        await queryClient.cancelQueries({ queryKey: ['device', id] });

        // Snapshot the previous value
        const previousDevice = queryClient.getQueryData(['device', id]);
        
        // Optimistically update the CACHE (not just local state)
        // This ensures if the user navigates away and back, it's still snappy
        queryClient.setQueryData(['device', id], (old: any) => ({
             ...old,
             current_state: newState
        }));
        
        return { previousDevice };
    },
    // We intentionally do NOT use onSuccess to overwrite local state
    // because that causes the "revert" glitch if the server state lags behind user clicks.
    // We let the cache invalidation handle eventual consistency.
    onError: (err, newTodo, context: any) => {
        // Rollback to previous state on ERROR only
        if (context?.previousDevice) {
             queryClient.setQueryData(['device', context.previousDevice.id], context.previousDevice);
             setCurrentState(context.previousDevice.current_state);
        }
        setIsRefetching(false);
        toast.error("Failed to sync device state");
    },
    onSettled: () => {
        // Mark that we are now waiting for the backend to reflect the change
        setIsRefetching(true);
        // Ensure invalidation happens strictly after state setting
        // We use a slight delay for visual consistency so the user sees "processing"
        setTimeout(() => {
             queryClient.invalidateQueries({ queryKey: ['devices'] });
        }, 300);
        
        // Safety timeout: stop the loading state after 5 seconds if the backend is stuck
        // This prevents infinite loading spinners
        setTimeout(() => {
           setIsRefetching(false);
        }, 5000);
    }
  });

  // Calculate if we are in a syncing state
  // We include isRefetching, but we clear it aggressively in the useEffect when data matches
  const isSyncing = isDebouncing || updateMutation.isPending || isRefetching;

  // Sync with prop updates - BUT ONLY if we are not currently managing a local update
  // This prevents the "flash" where incorrect server state overwrites our optimistic UI
  // However, if the server state matches our optimistic state, we should accept it to "settle" the sync 
  useEffect(() => {
    // Always sync critical status flags regardless of state syncing
    const serverOnline = device.status === 'online' || device.is_online;
    if (serverOnline !== isOnline) {
        setIsOnline(serverOnline);
    }

    // If not syncing, always accept server state
    if (!isSyncing) {
      setCurrentState(device.current_state || {});
      return;
    }

    // If syncing, we usually ignore server state to avoid "jumping"
    // BUT if the server state has "caught up" to what we wanted, we can stop ignoring it
    // This handles the "force send" scenario where the update has arrived
    const serverState = device.current_state || {};
    
    // We only care if the keys we modified match what is in the server state
    // AND if the server actually has those keys (to avoid empty state matches)
    const matchesOptimistic = Object.keys(currentState).length > 0 && Object.keys(currentState).every(key => 
        // Use loose equality for numbers/strings just in case
        String(currentState[key]) === String(serverState[key])
    );

    // Only clear the loading state if we are actually waiting for a refetch
    // This effectively "locks" the loading state until the backend response matches our optimistic state
    if (matchesOptimistic && isRefetching) {
        // The server caught up! We can "resync" and stop ignoring it
        setCurrentState(serverState);
        setIsRefetching(false);
    }
  }, [device, isSyncing, currentState, isRefetching]);

  const Icon = (device.icon ? getIconComponent(device.icon) : null) || Cpu;
  const cardTemplate = deviceType?.card_template;
  const controls: Control[] = cardTemplate?.controls || [];
  const layoutConfig: LayoutConfig = cardTemplate?.layout_config || {};

  const singleToggle = isSingleToggleDevice(controls);
  const toggleControls = getToggleControls(controls);

  const mutateRef = useRef(updateMutation.mutate);
  useEffect(() => { mutateRef.current = updateMutation.mutate; });

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    }
  }, []);

  const handleStateChange = useCallback(async (variable: string, value: any, isImmediate = false) => {
    // 1. Optimistic Update (Immediate UI change)
    const newState = { ...currentState, [variable]: value };
    setCurrentState(newState);
    
    if (readOnly) return;
    
    // Clear any existing timer to debounce
    if (timerRef.current) clearTimeout(timerRef.current);
    
    // Start local optimistic phase
    setIsDebouncing(true);
    
    // 2. Debounced API Call
    // If "immediate" (like a toggle click), use a very short 50ms debounce
    // This feels instant but prevents accidental double-execution
    // If "slider" (dragging), use standard 500ms debounce
    const delay = isImmediate ? 50 : 500;
    
    timerRef.current = setTimeout(() => {
      // Trigger mutation first so isPending becomes true roughly when we clear debouncing
      mutateRef.current({ id: device.id, newState });
      // Clear debouncing flag slightly later to ensure overlap so isSyncing never flickers false
      // This prevents the "gap" where neither debouncing nor pending is true
      setTimeout(() => setIsDebouncing(false), 50);
    }, delay);
    
  }, [currentState, readOnly, device.id]);

  // Handle card tap for single-toggle devices
  const handleCardTap = useCallback(() => {
    // Prevent interaction while syncing
    if (!isOnline || readOnly || !singleToggle || isSyncing) return;
    
    const toggle = toggleControls[0];
    const currentValue = !!currentState[toggle.variable_mapping];
    handleStateChange(toggle.variable_mapping, !currentValue, true);
  }, [isOnline, readOnly, singleToggle, toggleControls, currentState, handleStateChange, isSyncing]);

  // Determine if card should show "tap to toggle" behavior
  const isTappable = singleToggle && isOnline && !readOnly && !isSyncing;
  const isPoweredOn = singleToggle && !!currentState[toggleControls[0]?.variable_mapping];

  // Render individual widget based on type
  const renderWidget = (control: Control, index: number) => {
    const value = currentState[control.variable_mapping];
    // Disable interactions while syncing to prevent race conditions
    const isDisabled = !isOnline || readOnly || isSyncing;
    const widgetVariant = (control.variant || 'row') as 'row' | 'square';

    switch(control.widget_type) {
      case 'TOGGLE':
        // For single toggle devices, don't render the individual toggle (card is tappable)
        if (singleToggle) return null;
        
        const isOn = !!value;
        const toggleColor = isOn ? 'text-green-500' : 'text-muted-foreground';
        const toggleBg = isOn ? 'bg-green-500/10' : 'bg-muted/10';
        const toggleBorder = isOn ? 'border-green-500/30' : 'border-border/50';
        
        // Square variant for toggle
        if (widgetVariant === 'square') {
          return (
            <div 
              key={control.variable_mapping} 
              className={cn(
                "relative flex flex-col items-center justify-center p-2 rounded-xl border transition-all aspect-square overflow-hidden cursor-pointer",
                toggleBg, toggleBorder,
                isDisabled ? 'opacity-50' : 'hover:shadow-md active:scale-95',
                isOn && 'shadow-[0_0_12px_-3px_rgba(34,197,94,0.3)]',
                isSyncing && "animate-pulse border-primary/50"
              )}
              onClick={() => !isDisabled && handleStateChange(control.variable_mapping, !isOn, true)}
            >
                {isSyncing && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/20 backdrop-blur-[1px] z-10">
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    </div>
                )}
              <Power className={cn("w-5 h-5 mb-1", toggleColor)} />
              <span className={cn("text-lg font-bold leading-none", toggleColor)}>
                {isOn ? 'ON' : 'OFF'}
              </span>
              <span className="text-[9px] text-muted-foreground uppercase tracking-wider leading-none mt-1 text-center truncate w-full px-1">
                {control.label}
              </span>
            </div>
          );
        }
        
        // Row variant (default)
        return (
          <div 
            key={control.variable_mapping} 
            className={cn(
              "flex items-center justify-between px-3 py-2 rounded-xl border transition-all h-14",
              toggleBg, toggleBorder,
              isDisabled ? 'opacity-50' : 'hover:shadow-md'
            )}
          >
            <div className="flex items-center gap-3">
              <div className={cn("p-1.5 rounded-lg", toggleBg)}>
                <Power className={cn("w-4 h-4", toggleColor)} />
              </div>
              <span className="text-sm font-medium">{control.label}</span>
            </div>
            <Switch 
              checked={isOn}
              onCheckedChange={(checked) => handleStateChange(control.variable_mapping, checked, true)}
              disabled={isDisabled}
            />
          </div>
        );

      case 'SLIDER':
        const min = control.min_value ?? 0;
        const max = control.max_value ?? 100;
        const step = control.step ?? 1;
        const currentVal = typeof value === 'number' ? value : min;

        return (
          <div 
            key={control.variable_mapping} 
            className={cn(
              "space-y-3 p-3 rounded-xl bg-card/50 border border-border/50 transition-all",
              isDisabled ? 'opacity-50' : 'hover:bg-card/80'
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <SlidersHorizontal className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm font-medium">{control.label}</span>
              </div>
              <span className="text-sm font-mono font-semibold text-primary">{currentVal}</span>
            </div>
            <Slider 
              value={[currentVal]} 
              min={min} 
              max={max} 
              step={step}
              onValueChange={(vals) => handleStateChange(control.variable_mapping, vals[0], false)}
              disabled={isDisabled}
            />
          </div>
        );

      case 'TEMPERATURE':
        return (
          <TemperatureWidget
            key={control.variable_mapping}
            value={value}
            label={control.label}
            unit={control.unit}
            isDisabled={isDisabled}
            variant={widgetVariant}
          />
        );

      case 'HUMIDITY':
        return (
          <HumidityWidget
            key={control.variable_mapping}
            value={value}
            label={control.label}
            unit={control.unit}
            isDisabled={isDisabled}
            variant={widgetVariant}
          />
        );

      case 'MOTION':
        return (
          <MotionWidget
            key={control.variable_mapping}
            value={value}
            label={control.label}
            isDisabled={isDisabled}
            variant={widgetVariant}
          />
        );

      case 'LIGHT':
        return (
          <LightWidget
            key={control.variable_mapping}
            value={value}
            label={control.label}
            unit={control.unit}
            isDisabled={isDisabled}
            variant={widgetVariant}
          />
        );

      case 'CO2':
        return (
          <CO2Widget
            key={control.variable_mapping}
            value={value}
            label={control.label}
            unit={control.unit}
            isDisabled={isDisabled}
            variant={widgetVariant}
          />
        );

      case 'GAUGE':
        // Generic gauge display for unknown sensor types
        return (
          <div 
            key={control.variable_mapping}
            className={cn(
              "flex items-center justify-between p-3 rounded-xl bg-card/50 border border-border/50",
              isDisabled && 'opacity-50'
            )}
          >
            <span className="text-sm font-medium">{control.label}</span>
            <span className="text-lg font-mono font-semibold">
              {value ?? '--'}{control.unit || ''}
            </span>
          </div>
        );

      default:
        return null;
    }
  };

  // Group controls by variant for layout
  const squareControls = controls.filter(c => c.variant === 'square');
  const rowControls = controls.filter(c => c.variant !== 'square');

  // Determine grid columns (support both backend 'w' and frontend 'columns' format)
  const getGridCols = () => {
    const cols = layoutConfig.columns || layoutConfig.w || 2;
    if (cols === 1) return 'grid-cols-1';
    if (cols === 3) return 'grid-cols-3';
    return 'grid-cols-2';
  };

  const getGapClass = () => {
    const gap = layoutConfig.gap || 'md';
    if (gap === 'sm') return 'gap-2';
    if (gap === 'lg') return 'gap-4';
    return 'gap-3';
  };

  return (
    <Card 
      className={cn(
        "group transition-all duration-300 relative overflow-hidden select-none",
        isOnline 
          ? 'border-l-4 border-l-green-500 border-t-border border-r-border border-b-border shadow-[0_0_20px_-5px_rgba(34,197,94,0.15)] hover:shadow-[0_0_25px_-5px_rgba(34,197,94,0.25)] bg-card' 
          : 'border-l-4 border-l-zinc-400 dark:border-l-zinc-600 border-t-border/50 border-r-border/50 border-b-border/50 bg-muted/30 saturate-50 hover:saturate-100',
        isTappable && 'cursor-pointer active:scale-[0.98]',
        isTappable && isPoweredOn && 'shadow-[0_0_20px_-3px_rgba(245,158,11,0.4)]',
        animationIndex !== undefined && 'animate-[jelly-in_0.5s_cubic-bezier(0.2,0.6,0.35,1)_both]'
      )}
      style={animationIndex !== undefined ? { animationDelay: `${animationIndex * 60}ms` } : undefined}
      onClick={isTappable ? handleCardTap : undefined}
    >
      {/* Syncing Overlay - blurry loading state */}
      {isSyncing && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/10 backdrop-blur-[2px] transition-all duration-300">
           <div className="bg-background/80 p-2 rounded-full shadow-lg ring-1 ring-border/20">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
           </div>
        </div>
      )}

      {/* Offline overlay */}
      {!isOnline && (
        <div className="absolute inset-0 bg-background/40 backdrop-blur-[1px] z-10 pointer-events-none" />
      )}
      
      {/* Power glow for single-toggle devices */}
      {isTappable && isPoweredOn && (
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent pointer-events-none" />
      )}
      
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="flex flex-col gap-1 w-full overflow-hidden">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base font-semibold truncate" title={device.name}>
              {device.name}
            </CardTitle>
            {/* Only show badge for non-single-toggle devices - single toggle has cleaner status */}
            {!singleToggle && (
              <Badge 
                variant="secondary" 
                className={cn(
                  "text-[9px] h-4 px-1.5 py-0 font-medium shrink-0",
                  isOnline 
                    ? 'bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30' 
                    : 'bg-zinc-500/10 text-zinc-500 dark:text-zinc-400 border-zinc-500/20'
                )}
              >
                {isOnline ? 'CONNECTED' : 'OFFLINE'}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {roomName && (
              <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
                {roomIcon && (() => { const RI = getIconComponent(roomIcon); return RI ? <RI className="h-3 w-3" /> : null; })()}
                {roomName}
              </p>
            )}
            {deviceType && (
              <Badge variant="outline" className="text-[10px] h-4 px-1 py-0">{deviceType.name}</Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Single Toggle Device - Clean Home Assistant Style Layout */}
        {singleToggle ? (
          <div className="flex flex-col items-center py-2">
            {/* Large centered icon with power state */}
            <div className={cn(
              "relative p-5 rounded-2xl transition-all duration-300 mb-3",
              isPoweredOn 
                ? 'bg-gradient-to-br from-amber-400/20 via-yellow-500/15 to-orange-500/10 ring-2 ring-amber-500/40 shadow-[0_0_30px_-5px_rgba(245,158,11,0.4)]' 
                : 'bg-secondary/50 ring-1 ring-border/50',
            )}>
              {isPoweredOn && (
                <div className="absolute inset-0 rounded-2xl ring-2 ring-amber-400/30 animate-pulse" />
              )}
              <Icon className={cn(
                "w-10 h-10 relative z-10 transition-colors duration-300",
                isPoweredOn ? 'text-amber-500 dark:text-amber-400' : 'text-muted-foreground'
              )} />
            </div>
            
            {/* Power state label */}
            <div className={cn(
              "text-2xl font-bold tracking-tight mb-1 transition-colors",
              isPoweredOn ? 'text-amber-500 dark:text-amber-400' : 'text-muted-foreground'
            )}>
              {isPoweredOn ? 'ON' : 'OFF'}
            </div>
            
            {/* Tap hint */}
            {isTappable && (
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Tap to {isPoweredOn ? 'turn off' : 'turn on'}
              </span>
            )}

            {/* Connection status - small and subtle at bottom */}
            <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-border/50 w-full justify-center">
              <div className={cn(
                "h-1.5 w-1.5 rounded-full",
                isOnline ? 'bg-green-500' : 'bg-zinc-400'
              )} />
              <span className={cn(
                "text-[9px] uppercase tracking-wider",
                isOnline ? 'text-green-600/70 dark:text-green-400/70' : 'text-muted-foreground/70'
              )}>
                {isOnline ? 'Connected' : 'Offline'}
              </span>
              {device.ip_address && (
                <>
                  <span className="text-muted-foreground/30 mx-1">•</span>
                  <span className="text-[9px] font-mono text-muted-foreground/50">{device.ip_address}</span>
                </>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Multi-control devices - Original Layout */}
            {/* Top Section: Icon with status */}
            <div className="flex items-center justify-between">
              <div className={cn(
                "relative p-3 rounded-xl transition-all duration-300",
                isOnline 
                  ? 'bg-gradient-to-br from-green-500/20 to-emerald-500/10 text-green-600 dark:text-green-400 ring-2 ring-green-500/30 shadow-[0_0_15px_-3px_rgba(34,197,94,0.4)]' 
                  : 'bg-secondary/50 text-muted-foreground'
              )}>
                {isOnline && (
                  <div className="absolute inset-0 rounded-xl ring-2 ring-green-500/40 animate-pulse" />
                )}
                <Icon className="w-6 h-6 relative z-10" />
              </div>
              
              <div className="text-right">
                <div className="flex items-center gap-1.5 justify-end">
                  <div className={cn(
                    "h-2 w-2 rounded-full",
                    isOnline ? 'bg-green-500 animate-pulse' : 'bg-zinc-400 dark:bg-zinc-600'
                  )} />
                  <p className={cn(
                    "text-[10px] uppercase tracking-wider font-semibold",
                    isOnline ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'
                  )}>
                    {isOnline ? 'Online' : 'Offline'}
                  </p>
                </div>
                <p className="text-xs font-mono text-muted-foreground hidden md:block mt-0.5">
                  {device.ip_address || 'N/A'}
                </p>
              </div>
            </div>

            {/* Dynamic Controls */}
            {controls.length > 0 ? (
              <div className={cn(
                "pt-2 animate-in slide-in-from-bottom-2 duration-300",
                !isOnline && 'pointer-events-none relative z-0'
              )}>
                {/* Square widgets in a grid */}
                {squareControls.length > 0 && (
                  <div className={cn("grid mb-3", getGridCols(), getGapClass())}>
                    {squareControls.map((c, i) => renderWidget(c, i))}
                  </div>
                )}
                
                {/* Row widgets stacked */}
                {rowControls.length > 0 && (
                  <div className="space-y-2">
                    {rowControls.map((c, i) => renderWidget(c, i))}
                  </div>
                )}
              </div>
            ) : (
              <div className="py-2 flex items-center justify-center text-xs text-muted-foreground/50 border border-dashed rounded bg-muted/20">
                No controls configured
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
