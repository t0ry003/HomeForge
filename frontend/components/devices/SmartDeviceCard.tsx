
import React, { useState, useEffect, useRef } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { 
  Cpu, 
  ToggleLeft, 
  SlidersHorizontal,
  Power,
  Activity,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { getIconComponent } from "@/lib/icons";
import { updateDeviceState } from "@/lib/apiClient";
import { toast } from "sonner";
import { debounce } from "lodash";

interface SmartDeviceCardProps {
  device: any;
  deviceType: any;
  roomName?: string;
  readOnly?: boolean;
}

export default function SmartDeviceCard({ device, deviceType, roomName, readOnly = false }: SmartDeviceCardProps) {
  const [currentState, setCurrentState] = useState<any>(device.current_state || {});
  const [isOnline, setIsOnline] = useState(device.status === 'online' || device.is_online);
  const queryClient = useQueryClient();
  
  // Update local state if prop changes (e.g. from refresh)
  useEffect(() => {
    setCurrentState(device.current_state || {});
    setIsOnline(device.status === 'online' || device.is_online);
  }, [device]);

  const Icon = (device.icon ? getIconComponent(device.icon) : null) || Cpu;
  const cardTemplate = deviceType?.card_template;
  const controls = cardTemplate?.controls || [];

  const updateMutation = useMutation({
    mutationFn: async ({ id, newState }: { id: string; newState: any }) => {
        return updateDeviceState(id, newState);
    },
    onSuccess: () => {
        // Invalidate fetching to sync
        queryClient.invalidateQueries({ queryKey: ['devices'] });
    },
    onError: () => {
         toast.error("Failed to sync device state");
         // Revert happens via parent prop update next cycle or local handling?
         // We do local optimistic update below.
    }
  });


  const mutateRef = useRef(updateMutation.mutate);
  useEffect(() => { mutateRef.current = updateMutation.mutate; });

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
      return () => {
          if (timerRef.current) clearTimeout(timerRef.current);
      }
  }, []);

  // Debounced API call for sliders
  const debouncedUpdate = useRef(
    debounce((id: string, newState: any) => {
        if (readOnly) return;
        mutateRef.current({ id, newState });
    }, 500)
  ).current;

  const handleStateChange = async (variable: string, value: any, isImmediate = false) => {
      // Optimistic Update
      const newState = { ...currentState, [variable]: value };
      setCurrentState(newState);
      
      if (readOnly) return;

      // START PATCH
    if (true) {
        if (isImmediate) {
            if (timerRef.current) clearTimeout(timerRef.current);
            updateMutation.mutate({ id: device.id, newState });
        } else {
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => {
                mutateRef.current({ id: device.id, newState });
            }, 500);
        }
        return;
    }
    // END PATCH
    if (isImmediate) {
          // Immediate update for toggles
          updateMutation.mutate({ id: device.id, newState });
          // Debounced for sliders
          debouncedUpdate(device.id, newState);
      }
  };

  const renderWidget = (control: any) => {
      const value = currentState[control.variable_mapping];
      const isDisabled = !isOnline || readOnly;

      switch(control.widget_type) {
          case 'TOGGLE':
              return (
                  <div key={control.variable_mapping} className={`flex items-center justify-between p-2 rounded-lg bg-card/50 border border-border/50 ${isDisabled ? 'opacity-50' : ''}`}>
                      <div className="flex items-center gap-2">
                          <Power className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{control.label}</span>
                      </div>
                      <Switch 
                          checked={!!value}
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
                  <div key={control.variable_mapping} className={`space-y-3 p-2 rounded-lg bg-card/50 border border-border/50 ${isDisabled ? 'opacity-50' : ''}`}>
                      <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                              <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm font-medium">{control.label}</span>
                          </div>
                          <span className="text-xs font-mono text-muted-foreground">{currentVal}</span>
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
          default:
              return null;
      }
  };

  return (
    <Card className={`group transition-all duration-300 relative overflow-hidden
        ${isOnline 
            ? 'border-l-4 border-l-green-500 border-t-border border-r-border border-b-border shadow-[0_0_20px_-5px_rgba(34,197,94,0.15)] hover:shadow-[0_0_25px_-5px_rgba(34,197,94,0.25)] bg-card' 
            : 'border-l-4 border-l-zinc-400 dark:border-l-zinc-600 border-t-border/50 border-r-border/50 border-b-border/50 bg-muted/30 saturate-50 hover:saturate-100'
        }
    `}>
        {/* Offline overlay */}
        {!isOnline && (
            <div className="absolute inset-0 bg-background/40 backdrop-blur-[1px] z-10 pointer-events-none" />
        )}
        
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <div className="flex flex-col gap-1 w-full overflow-hidden">
                <div className="flex items-center gap-2">
                    <CardTitle className="text-base font-semibold truncate" title={device.name}>
                        {device.name}
                    </CardTitle>
                    {/* Status badge */}
                    <Badge 
                        variant="secondary" 
                        className={`text-[9px] h-4 px-1.5 py-0 font-medium shrink-0
                            ${isOnline 
                                ? 'bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30' 
                                : 'bg-zinc-500/10 text-zinc-500 dark:text-zinc-400 border-zinc-500/20'
                            }`}
                    >
                        {isOnline ? 'CONNECTED' : 'OFFLINE'}
                    </Badge>
                </div>
                <div className="flex items-center gap-2">
                    {roomName && (
                        <p className="text-xs text-muted-foreground">
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
            {/* Top Section: Icon with glow ring & Status */}
            <div className="flex items-center justify-between">
                 <div className={`relative p-3 rounded-xl transition-all duration-300
                    ${isOnline 
                        ? 'bg-gradient-to-br from-green-500/20 to-emerald-500/10 text-green-600 dark:text-green-400 ring-2 ring-green-500/30 shadow-[0_0_15px_-3px_rgba(34,197,94,0.4)]' 
                        : 'bg-secondary/50 text-muted-foreground'}
                `}>
                    {/* Pulse ring for online devices */}
                    {isOnline && (
                        <div className="absolute inset-0 rounded-xl ring-2 ring-green-500/40 animate-pulse" />
                    )}
                    <Icon className="w-6 h-6 relative z-10" />
                </div>
                
                <div className="text-right">
                     <div className="flex items-center gap-1.5 justify-end">
                        <div className={`h-2 w-2 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-zinc-400 dark:bg-zinc-600'}`} />
                        <p className={`text-[10px] uppercase tracking-wider font-semibold
                            ${isOnline ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                            {isOnline ? 'Online' : 'Offline'}
                        </p>
                     </div>
                     <p className="text-xs font-mono text-muted-foreground hidden md:block mt-0.5">{device.ip_address || 'N/A'}</p>
                </div>
            </div>

            {/* Dynamic Controls */}
            {controls.length > 0 ? (
                <div className={`pt-2 space-y-2 animate-in slide-in-from-bottom-2 duration-300 ${!isOnline ? 'pointer-events-none relative z-0' : ''}`}>
                    {controls.map((c: any) => renderWidget(c))}
                </div>
            ) : (
                <div className="py-2 flex items-center justify-center text-xs text-muted-foreground/50 border border-dashed rounded bg-muted/20">
                    No controls configured
                </div>
            )}
        </CardContent>
    </Card>
  );
}
