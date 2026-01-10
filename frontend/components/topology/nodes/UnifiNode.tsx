import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Router, Wifi, Smartphone, Server, Cpu, SwitchCamera, Laptop, Printer, Tv } from 'lucide-react';
import { clsx } from 'clsx';
import { Badge } from "@/components/ui/badge";

const iconMap: Record<string, any> = {
  gateway: Router,
  wired: SwitchCamera, 
  switch: SwitchCamera,
  ap: Wifi,
  wireless: Wifi,
  client: Smartphone,
  server: Server,
  opendash: Cpu,
  laptop: Laptop,
  printer: Printer,
  tv: Tv
};

const UnifiNode = ({ data, selected }: NodeProps) => {
  const details = (data.details as any) || data;
  const label = data.label || details.label || details.name || 'Unknown';
  const ip = details.ip || details.ip_address; 
  const roomName = details.roomName;
  const type = (details.type || details.device_type || 'client').toLowerCase();
  const status = (details.status || (details.is_online ? 'online' : 'offline') || 'unknown').toLowerCase();
  
  const isOnline = status === 'online';
  const Icon = iconMap[type] || iconMap.client;
  
  return (
    <div className="group relative flex flex-col items-center justify-center pointer-events-auto">
      <Handle 
        type="target" 
        position={Position.Top} 
        className="!w-0 !h-0 !opacity-0 !border-0 pointer-events-none" 
      />

      {/* Main Circle Node */}
      <div className={clsx(
        "relative flex items-center justify-center w-14 h-14 rounded-full bg-background shadow-sm transition-all duration-300",
        "border-[3px]",
        isOnline ? "border-green-500/20" : "border-zinc-300 dark:border-zinc-700",
        selected ? "scale-110 ring-4 ring-primary/20 border-primary" : "hover:scale-105 hover:shadow-md",
        "z-10"
      )}>
        {/* Status Dot */}
        <div className={clsx(
            "absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-background z-20",
            isOnline ? "bg-green-500" : "bg-zinc-400"
        )} />

        <Icon className={clsx(
          "w-7 h-7",
          isOnline ? "text-foreground" : "text-muted-foreground/50"
        )} />
      </div>

      {/* Label (Always visible Name) */}
      <div className={clsx(
        "absolute top-16 px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-tight text-center whitespace-nowrap bg-background/80 backdrop-blur-sm border border-border/50 shadow-sm transition-all z-20",
        selected && "opacity-0 translate-y-2 pointer-events-none"
      )}>
        {label}
      </div>

      {/* Detailed Info (Only when Selected) */}
      {selected && (
         <div className="absolute top-24 flex flex-col items-center gap-1 z-30 animate-in fade-in slide-in-from-top-2">
            <Badge variant="outline" className="h-5 px-1.5 text-[9px] font-mono bg-background/95 backdrop-blur shadow-sm">
                {ip || 'No IP'}
            </Badge>

            {roomName && (
                <Badge variant="secondary" className="h-5 px-1.5 text-[9px] whitespace-nowrap bg-secondary/80 backdrop-blur shadow-sm">
                    {roomName}
                </Badge>
            )}
         </div>
      )}

      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="!w-0 !h-0 !opacity-0 !border-0 pointer-events-none" 
      />
    </div>
  );
};

export default memo(UnifiNode);
