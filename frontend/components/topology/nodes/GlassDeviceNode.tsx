import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { Router, Network, Wifi, Smartphone, Server, Cpu, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { DeviceData } from '@/hooks/useTopologyLayout';
import { Badge } from "@/components/ui/badge";

const iconMap = {
  gateway: Router,
  switch: Network,
  ap: Wifi,
  client: Smartphone,
  server: Server,
  opendash: Cpu
};

const typeColors: Record<string, string> = {
  gateway: 'text-blue-400 border-blue-500/50 bg-blue-500/10',
  switch: 'text-cyan-400 border-cyan-500/50 bg-cyan-500/10',
  ap: 'text-purple-400 border-purple-500/50 bg-purple-500/10',
  client: 'text-green-400 border-green-500/50 bg-green-500/10',
  server: 'text-orange-400 border-orange-500/50 bg-orange-500/10',
  opendash: 'text-indigo-400 border-indigo-500/50 bg-indigo-500/10',
};

export default function GlassDeviceNode({ data, selected }: NodeProps<Node<DeviceData>>) {
  const Icon = iconMap[data.device_type as keyof typeof iconMap] || Smartphone;
  const isOnline = data.is_online;
  const isRoot = data.device_type === 'opendash' || data.device_type === 'gateway';
  
  // Determine base color style
  const colorStyle = isOnline 
    ? (typeColors[data.device_type] || typeColors.client)
    : 'text-zinc-500 border-zinc-800 bg-zinc-900/20 backdrop-blur-sm'; // Glassy offline look

  return (
    <div className={clsx(
      "relative flex flex-col items-center justify-center p-3 rounded-xl backdrop-blur-md transition-all duration-300 group",
      // Width handling: Fixed min-width, expands when selected to fit content
      selected ? 'min-w-[8rem] w-auto px-6' : (isRoot ? 'w-28' : 'w-24'),
      isRoot ? 'h-28' : 'h-24',
      selected 
        ? 'border-2 border-white shadow-[0_0_20px_rgba(255,255,255,0.2)] bg-zinc-900/90 z-50' 
        : clsx("border hover:bg-zinc-900/95 hover:scale-105 hover:shadow-lg", colorStyle)
    )}>
      {/* Incoming Handle - Hidden for Topology */}
      <Handle 
        type="target" 
        position={Position.Left} 
        className="!w-0 !h-0 !opacity-0 !border-0 pointer-events-none"
      />
      
      {/* Status Indicator */}
      <div className={clsx(
        "absolute top-2 right-2 w-2 h-2 rounded-full",
        isOnline 
          ? (selected ? 'bg-green-400 animate-pulse' : 'bg-green-500/50') 
          : 'bg-red-500/50'
      )} />

      {/* Icon */}
      <div className={clsx(
        "p-2 rounded-full mb-2 transition-transform duration-300",
        isOnline ? "bg-zinc-950/30" : "bg-zinc-800/30",
        selected ? 'scale-110' : ''
      )}>
        <Icon className={clsx(
          isRoot ? 'w-8 h-8' : 'w-6 h-6',
          isOnline ? colorStyle.split(' ')[0] : 'text-zinc-600'
        )} />
      </div>

      {/* Label */}
      <span className={clsx(
        "text-[10px] font-bold uppercase tracking-wider text-center leading-tight px-1 transition-all duration-300",
        selected ? 'text-white whitespace-nowrap' : 'text-zinc-400 truncate w-full'
      )}>
        {data.name}
      </span>

      {/* IP Address (Only when selected) */}
      {selected && data.ip_address && (
        <span className="text-[8px] text-zinc-500 mt-1 font-mono animate-in fade-in slide-in-from-top-1">
          {data.ip_address}
        </span>
      )}

      {!isOnline && (
         <div className="absolute -bottom-2 bg-red-500/10 border border-red-500/50 text-red-400 text-[8px] px-1.5 py-0.5 rounded-full flex items-center gap-1">
           <AlertCircle className="w-2 h-2" />
           OFFLINE
         </div>
      )}

      {/* Outgoing Handle - Hidden for Topology */}
      <Handle 
        type="source" 
        position={Position.Right} 
        className="!w-0 !h-0 !opacity-0 !border-0 pointer-events-none"
      />
    </div>
  );
}
