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
  Router,
  Monitor,
  Tablet,
  Printer,
  Camera,
  Cast
} from 'lucide-react';
import { clsx } from 'clsx';
import { getIconComponent } from '@/lib/icons';

// Mapping equivalent to AVAILABLE_SENSORS but for Topology types
const TYPE_CONFIG: Record<string, { icon: any, color: string }> = {
  // Gateway / Master types (Blue like MCU)
  gateway: { icon: Server, color: 'text-blue-500 border-blue-500/50 bg-blue-500/10' },
  server: { icon: Server, color: 'text-blue-500 border-blue-500/50 bg-blue-500/10' },
  
  // Device types
  camera: { icon: Camera, color: 'text-red-500 border-red-500/50 bg-red-500/10' },
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
  
  // Unifi / General additions
  laptop: { icon: Laptop, color: 'text-indigo-500 border-indigo-500/50 bg-indigo-500/10' },
  desktop: { icon: Monitor, color: 'text-indigo-500 border-indigo-500/50 bg-indigo-500/10' },
  tablet: { icon: Tablet, color: 'text-pink-500 border-pink-500/50 bg-pink-500/10' },
  printer: { icon: Printer, color: 'text-amber-500 border-amber-500/50 bg-amber-500/10' },
  iot: { icon: Cast, color: 'text-emerald-500 border-emerald-500/50 bg-emerald-500/10' },

  // Fallback
  default: { icon: Cpu, color: 'text-slate-500 border-slate-500/50 bg-slate-500/10' }
};

// Resolve node type configuration - ONLY based on device_type for consistency
const resolveType = (type: string = '', id: string = '') => {
  const t = type.toLowerCase();
  const i = id.toLowerCase();
  
  // Only check type and ID for gateway detection (input is a ReactFlow type)
  if (t.includes('gateway') || i.includes('gateway') || t === 'input') return TYPE_CONFIG.gateway;
  if (t.includes('server')) return TYPE_CONFIG.server;
  if (t.includes('camera')) return TYPE_CONFIG.camera;
  if (t.includes('light') || t.includes('bulb')) return TYPE_CONFIG.light;
  if (t.includes('sensor') || t.includes('temp') || t.includes('humid')) return TYPE_CONFIG.sensor;
  if (t.includes('switch') || t.includes('plug') || t.includes('relay')) return TYPE_CONFIG.switch;
  if (t.includes('wifi') || t.includes('ap') || t.includes('access point')) return TYPE_CONFIG.ap;
  if (t.includes('router') || t.includes('udm')) return TYPE_CONFIG.router;
  if (t.includes('pc') || t.includes('laptop') || t.includes('desktop') || t.includes('computer')) return TYPE_CONFIG.computer;
  if (t.includes('phone') || t.includes('mobile')) return TYPE_CONFIG.mobile;
  if (t.includes('tablet')) return TYPE_CONFIG.tablet;
  if (t.includes('printer')) return TYPE_CONFIG.printer;
  if (t.includes('iot')) return TYPE_CONFIG.iot;
  
  return TYPE_CONFIG.default;
};

export default memo(({ id, data, selected }: NodeProps<Node>) => {
  const config = resolveType(data.device_type || data.type, id);
  
  // Use custom icon if provided, else component default
  const CustomIcon = data.icon ? getIconComponent(data.icon) : null;
  const Icon = CustomIcon || config.icon;
  
  // Gateway/Root check
  const isRoot = data.type === 'input' || (typeof data.device_type === 'string' && data.device_type.includes('gateway')) || id.toLowerCase().includes('gateway');
  
  // Online Status
  const isOnline = data.status === 'online' || data.is_online === true;
  
  return (
    <div className={clsx(
      "relative flex items-center p-3 rounded-xl backdrop-blur-md transition-all duration-300",
      // Size - Logic updated to prioritize horizontal growth
      selected 
        ? 'flex-row gap-4 w-auto min-w-[300px] h-24 p-3 pr-6 items-center justify-start' // Selected: Horizontal layout, fixed height
        : clsx(
            "flex-col justify-center", // Default column
            isRoot ? 'w-auto min-w-32 h-32 px-4' : 'w-auto min-w-24 h-24 px-3'
        ),
      // Style - mimicking BuilderStyleNode but applied for horizontal layout
      selected 
        ? 'border-2 border-primary shadow-[0_0_20px_rgba(var(--primary),0.2)] bg-card/95 z-50' 
        : `border ${config.color || 'border-blue-500/50 text-blue-500'} bg-card/80 hover:bg-card/95 hover:scale-105 hover:shadow-lg`
    )}>
      {/* 
          Topology is Left -> Right
          Devices need Target on LEFT to receive from Server.
          Server needs Source on RIGHT to send to Devices.
          We can just render both or conditionally render based on isRoot 
      */}

      {/* Target Handle (Left) - For satellites receiving connection */}
      {!isRoot && (
        <Handle 
            type="target" 
            position={Position.Left} 
            className="!w-2 !h-2 !-left-1 !bg-muted-foreground opacity-50 transition-opacity hover:opacity-100"
        />
      )}
      
      {/* Source Handle (Right) - For Root sending connection */}
      {isRoot && (
        <Handle 
            type="source" 
            position={Position.Right} 
            className="!w-2 !h-2 !-right-1 !bg-primary opacity-50 transition-opacity hover:opacity-100"
        />
      )}

      {/* Online Status Dot */}
      <div className={clsx(
        "absolute top-2 right-2 w-2.5 h-2.5 rounded-full border border-background",
        isOnline ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse" : "bg-red-500/50"
      )} />

      {/* Icon Circle */}
      <div className={clsx(
        "rounded-full transition-transform duration-300 flex items-center justify-center shrink-0",
        selected ? 'p-2' : 'p-2.5 mb-2',
        isRoot ? 'bg-blue-500/20 shadow-inner' : 'bg-muted/30',
        selected ? 'scale-100' : ''
      )}>
        <Icon className={clsx(
          isRoot ? 'w-10 h-10' : 'w-6 h-6',
          (config.color || '').split(' ')[0] // Extract text-color class
        )} />
      </div>

      {/* Label & Details */}
      <div className={clsx(
          "w-full overflow-hidden flex", 
          selected ? "flex-col items-start text-left" : "flex-col items-center text-center"
      )}>
        <span className={clsx(
            "font-bold uppercase tracking-wider leading-tight px-1",
            selected ? 'text-sm text-foreground whitespace-nowrap' : 'text-[10px] text-muted-foreground whitespace-nowrap w-full'
        )}>
            {data.name || data.label || id}
        </span>
        
        {/* Info on Select (IP & Room) - Horizontal Layout */}
        {selected && (
            <div className="flex flex-col items-start mt-1 w-full animate-in fade-in slide-in-from-left-2 duration-200">
                 <div className="flex items-center gap-2 mt-1">
                     {(data.ip || data.ip_address) && (
                        <span className="text-[11px] font-mono bg-muted px-1.5 py-0.5 rounded text-foreground border border-border">
                            {data.ip || data.ip_address}
                        </span>
                     )}
                     {data.room && (
                        <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide border-l border-border pl-2">
                            {data.room}
                        </span>
                     )}
                 </div>
            </div>
        )}
        
        {/* Fallback Hover IP (When not selected) */}
        {!selected && (data.ip || data.ip_address) && (
            <span className="text-[9px] text-muted-foreground/60 mt-1 font-mono hidden group-hover:block transition-all">
                {data.ip || data.ip_address}
            </span>
        )}
      </div>
    </div>
  );
});
