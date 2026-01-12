import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { 
  Router, 
  Network, 
  Wifi, 
  Smartphone, 
  Server, 
  Cpu, 
  Laptop, 
  Monitor, 
  Tablet,
  Printer,
  Camera,
  Cast
} from 'lucide-react';
import { clsx } from 'clsx';
import { DeviceData } from '@/hooks/useTopologyLayout';

const iconMap: Record<string, typeof Router> = {
  gateway: Router,
  switch: Network,
  ap: Wifi,
  client: Smartphone,
  server: Server,
  opendash: Cpu,
  laptop: Laptop,
  desktop: Monitor,
  tablet: Tablet,
  printer: Printer,
  camera: Camera,
  iot: Cast
};

export default function UnifiDeviceNode({ data, selected }: NodeProps<Node<DeviceData>>) {
  // Heuristic for icon selection based on name or type
  let Icon = iconMap[data.device_type as keyof typeof iconMap];
  
  if (!Icon) {
      const lowerName = (data.name || '').toLowerCase();
      if (lowerName.includes('macbook') || lowerName.includes('laptop')) Icon = Laptop;
      else if (lowerName.includes('iphone') || lowerName.includes('phone') || lowerName.includes('mobile')) Icon = Smartphone;
      else if (lowerName.includes('ipad') || lowerName.includes('tablet')) Icon = Tablet;
      else if (lowerName.includes('camera')) Icon = Camera;
      else if (lowerName.includes('tv')) Icon = Monitor;
      else Icon = Smartphone; // Default
  }

  const isOnline = data.is_online;
  // In Unifi topology, root devices (Gateway/Switch) are often on the left.
  // We'll treat handles uniformly.

  return (
    <div className={clsx(
      "group flex flex-col items-center justify-center transition-all duration-300",
      selected ? "scale-110" : "scale-100"
    )}>
      {/* Target Handle (Left) */}
      <Handle 
        type="target" 
        position={Position.Left} 
        className="!w-1 !h-1 !bg-transparent !border-0"
      />

      {/* Icon Container - Floating style */}
      <div className="relative mb-2">
         {/* Glow effect for online status (subtle) */}
         {isOnline && (
            <div className="absolute inset-0 bg-green-500/20 blur-xl rounded-full opacity-50" />
         )}
         
         {/* Actual Icon */}
         <div className={clsx(
             "relative z-10 p-2",
             // Unifi icons are often whitish on dark bg in dark mode, or dark on light.
             // Assuming dark mode dashboard based on 'glass' context previously.
             "text-foreground",
             !isOnline && "opacity-50 grayscale"
         )}>
            <Icon 
                strokeWidth={1.5} 
                className={clsx(
                    "w-10 h-10 md:w-12 md:h-12 drop-shadow-lg", 
                    selected ? "text-primary" : "text-zinc-100 dark:text-zinc-200"
                )} 
            />
         </div>
      </div>

      {/* Label */}
      <div className="flex flex-col items-center">
        <span className={clsx(
          "text-xs font-medium tracking-wide text-center max-w-[120px] truncate transition-colors",
          selected ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
        )}>
            {data.name}
        </span>
        
        {/* Detail (IP or extra info) - Unifi shows this small below */}
        {selected && data.ip_address && (
             <span className="text-[10px] text-muted-foreground/60 font-mono mt-0.5">
                {data.ip_address}
             </span>
        )}
      </div>

      {/* Source Handle (Right) */}
      <Handle 
        type="source" 
        position={Position.Right} 
        className="!w-1 !h-1 !bg-transparent !border-0"
      />
    </div>
  );
}
