import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Router, Wifi, Smartphone, Server, Cpu } from 'lucide-react';
import { clsx } from 'clsx';
import { Badge } from "@/components/ui/badge";

// Map types to icons
const iconMap: Record<string, any> = {
  gateway: Router,
  switch:  Wifi, // or Network
  ap:      Wifi,
  client:  Smartphone,
  server:  Server,
  opendash: Cpu
};

// Map status to colors
const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'online': return 'text-green-500 border-green-500/50 bg-green-500/10 shadow-green-500/20';
    case 'offline': return 'text-red-500 border-red-500/50 bg-red-500/10 shadow-red-500/20';
    default: return 'text-yellow-500 border-yellow-500/50 bg-yellow-500/10';
  }
};

const DeviceNode = ({ data, selected }: NodeProps) => {
  // Extract data from 'details' if present (Guide Format) or 'data' directly
  const details = (data.details as any) || data;
  
  const label = data.label || details.label || details.name || 'Unknown';
  const ip = details.ip || details.ip_address || 'N/A';
  const room = details.room || 'Unassigned';
  const type = details.type || details.device_type || 'device';
  const status = details.status || 'unknown';

  const isOnline = status.toLowerCase() === 'online';
  const Icon = iconMap[type.toLowerCase()] || Smartphone;
  const statusClasses = getStatusColor(status);

  return (
    <div className={clsx(
      "relative min-w-[180px] rounded-xl border-2 backdrop-blur-xl transition-all duration-300",
      "flex flex-col overflow-hidden",
      statusClasses,
      selected ? 'ring-2 ring-primary scale-105 z-50 shadow-xl' : 'hover:shadow-lg hover:scale-105'
    )}>
      <Handle 
        type="target" 
        position={Position.Top} 
        className="!w-3 !h-3 !-top-1.5 !bg-muted-foreground/50 !border-2 !border-background" 
      />

      {/* Header */}
      <div className="flex items-center gap-2 p-3 border-b border-border/50 bg-muted/40 font-bold text-sm">
         <Icon className="w-4 h-4" />
         <span className="truncate">{label}</span>
      </div>

      {/* Body */}
      <div className="p-3 text-xs space-y-1.5 text-muted-foreground bg-background/60">
        <div className="flex justify-between items-center">
            <span className="font-semibold text-foreground/80">IP:</span>
            <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded">{ip}</span>
        </div>
        <div className="flex justify-between items-center">
            <span className="font-semibold text-foreground/80">Room:</span>
            <span className="truncate max-w-[100px]">{room}</span>
        </div>
        <div className="flex justify-between items-center">
            <span className="font-semibold text-foreground/80">Type:</span>
            <span className="uppercase tracking-wider text-[10px]">{type}</span>
        </div>
      </div>

      {/* Footer Status */}
      <div className={clsx(
        "p-1.5 text-center text-[10px] uppercase font-bold tracking-widest border-t border-border/50",
        isOnline ? "bg-green-500/20 text-green-600 dark:text-green-400" : "bg-red-500/20 text-red-600 dark:text-red-400"
      )}>
        {status}
      </div>

      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="!w-3 !h-3 !-bottom-1.5 !bg-muted-foreground/50 !border-2 !border-background" 
      />
    </div>
  );
};

export default memo(DeviceNode);
