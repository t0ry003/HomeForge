import React, { memo } from 'react';
import { Handle, Position, NodeProps, Node, useEdges } from '@xyflow/react';
import { 
  Cpu, 
  Thermometer, 
  Droplets, 
  Activity, 
  Sun, 
  ToggleLeft, 
  Server, 
  Wifi, 
  Video, 
  Laptop, 
  Smartphone,
  Router
} from 'lucide-react';
import { clsx } from 'clsx';

import { getIconComponent } from '@/lib/icons';

// Mapping equivalent to AVAILABLE_SENSORS but for Topology types
const TYPE_CONFIG: Record<string, { icon: any, color: string }> = {
  // Gateway / Master types (Blue like MCU)
  gateway: { icon: Server, color: 'text-blue-500 border-blue-500/50 bg-blue-500/10' },
  server: { icon: Server, color: 'text-blue-500 border-blue-500/50 bg-blue-500/10' },
  
  // Device types
  camera: { icon: Video, color: 'text-red-500 border-red-500/50 bg-red-500/10' },
  light: { icon: Sun, color: 'text-yellow-500 border-yellow-500/50 bg-yellow-500/10' },
  sensor: { icon: Activity, color: 'text-cyan-500 border-cyan-500/50 bg-cyan-500/10' },
  switch: { icon: ToggleLeft, color: 'text-green-500 border-green-500/50 bg-green-500/10' },
  thermostat: { icon: Thermometer, color: 'text-orange-500 border-orange-500/50 bg-orange-500/10' },
  humidity: { icon: Droplets, color: 'text-cyan-500 border-cyan-500/50 bg-cyan-500/10' },
  
  // IT Infrastructure
  computer: { icon: Laptop, color: 'text-indigo-500 border-indigo-500/50 bg-indigo-500/10' },
  mobile: { icon: Smartphone, color: 'text-indigo-500 border-indigo-500/50 bg-indigo-500/10' },
  ap: { icon: Wifi, color: 'text-purple-500 border-purple-500/50 bg-purple-500/10' },
  router: { icon: Router, color: 'text-purple-500 border-purple-500/50 bg-purple-500/10' },
  
  // Fallback
  default: { icon: Cpu, color: 'text-slate-500 border-slate-500/50 bg-slate-500/10' }
};

const resolveType = (type: string = '', id: string = '') => {
  const t = type.toLowerCase();
  const i = id.toLowerCase();
  
  if (t.includes('gateway') || i.includes('gateway') || t === 'input') return TYPE_CONFIG.gateway;
  if (t.includes('server')) return TYPE_CONFIG.server;
  if (t.includes('camera')) return TYPE_CONFIG.camera;
  if (t.includes('light') || t.includes('bulb')) return TYPE_CONFIG.light;
  if (t.includes('sensor') || t.includes('temp') || t.includes('humid')) return TYPE_CONFIG.sensor;
  if (t.includes('switch') || t.includes('plug') || t.includes('relay')) return TYPE_CONFIG.switch;
  if (t.includes('wifi') || t.includes('ap') || t.includes('access point')) return TYPE_CONFIG.ap;
  if (t.includes('router') || t.includes('udm')) return TYPE_CONFIG.router;
  if (t.includes('pc') || t.includes('laptop') || t.includes('mac') || t.includes('desktop')) return TYPE_CONFIG.computer;
  if (t.includes('phone') || t.includes('mobile')) return TYPE_CONFIG.mobile;
  
  return TYPE_CONFIG.default;
};

export default memo(({ id, data, selected }: NodeProps<Node>) => {
  const config = resolveType(data.device_type || data.type, id);
  
  // Use custom icon if provided, else component default
  const CustomIcon = data.icon ? getIconComponent(data.icon) : null;
  const Icon = CustomIcon || config.icon;
  
  // Gateway/Root check
  const isRoot = data.type === 'input' || (typeof data.device_type === 'string' && data.device_type.includes('gateway')) || id.toLowerCase().includes('gateway');
  
  // Status check for "Online" dot logic (Device Builder uses strict green for selected, we use status)
  const isOnline = data.status === 'online' || data.is_online === true;
  
  // Edges for handle visibility triggers
  const edges = useEdges();
  
  // Determine Connectivity for handles (for visual fidelity with Builder)
  const isConnectedTop = edges.some(e => e.source === id); 
  const isConnectedBottom = edges.some(e => e.target === id); 
  
  // In Builder, showHandles depends on selection. Here we can also check selection.
  const showHandles = selected; // Simplified for topology

  return (
    <div className={clsx(
      "relative flex flex-col items-center justify-center p-3 rounded-xl backdrop-blur-md transition-all duration-300",
      isRoot ? 'w-28 h-28' : 'w-24 h-24',
      selected 
        ? 'border-2 border-primary shadow-[0_0_20px_rgba(var(--primary),0.2)] bg-card/90' 
        : `border ${config.color || 'border-blue-500/50 text-blue-500'} bg-card/80 hover:bg-card/95 hover:scale-105 hover:shadow-lg`
    )}>
      <Handle 
        type="source" 
        position={Position.Top} 
        className={clsx(
          "!w-3 !h-3 !-top-1.5 transition-all duration-200",
          (showHandles || isConnectedTop) ? 'opacity-100' : 'opacity-0',
          selected ? '!bg-primary' : '!bg-muted-foreground'
        )} 
      />
      
      {/* Status Dot - Replaces Builder's "selected" dot logic with "online/status" logic for Topology Use Case */}
      <div className={clsx(
        "absolute top-2 right-2 w-2 h-2 rounded-full",
        isOnline ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-red-500/50"
      )} />

      <div className={clsx(
        "p-2 rounded-full mb-2 transition-transform duration-300",
        isRoot ? 'bg-blue-500/20' : 'bg-muted/50',
        selected ? 'scale-110' : ''
      )}>
        <Icon className={clsx(
          isRoot ? 'w-8 h-8' : 'w-6 h-6',
          (config.color || '').split(' ')[0] // Extract text-color class
        )} />
      </div>

      <span className={clsx(
        "text-[10px] font-bold uppercase tracking-wider text-center leading-tight truncate w-full px-1",
        selected ? 'text-foreground' : 'text-muted-foreground'
      )}>
        {data.label || id}
      </span>
      
      {/* Optional IP Address line if available, to add detail */}
      {data.ip_address && (
         <span className="text-[9px] text-muted-foreground/60 mt-0.5 font-mono">
            {data.ip_address}
         </span>
      )}

      <Handle 
        type="target" 
        position={Position.Bottom} 
        className={clsx(
          "!w-3 !h-3 !-bottom-1.5 transition-all duration-200",
          (showHandles || isConnectedBottom) ? 'opacity-100' : 'opacity-0',
          selected ? '!bg-primary' : '!bg-muted-foreground'
        )} 
      />
    </div>
  );
});
