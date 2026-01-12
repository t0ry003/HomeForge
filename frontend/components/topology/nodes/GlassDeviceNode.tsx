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
  gateway: 'text-blue-600 dark:text-blue-400 bg-blue-500/10',
  switch: 'text-cyan-600 dark:text-cyan-400 bg-cyan-500/10',
  ap: 'text-purple-600 dark:text-purple-400 bg-purple-500/10',
  client: 'text-green-600 dark:text-green-400 bg-green-500/10',
  server: 'text-orange-600 dark:text-orange-400 bg-orange-500/10',
  opendash: 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/10',
};

export default function GlassDeviceNode({ data, selected }: NodeProps<Node<DeviceData>>) {
  const Icon = iconMap[data.device_type as keyof typeof iconMap] || Smartphone;
  const isOnline = data.is_online;
  const isRoot = data.device_type === 'opendash' || data.device_type === 'gateway';
  
  // Determine base color style
  const colorStyle = isOnline 
    ? (typeColors[data.device_type] || typeColors.client)
    : 'text-muted-foreground bg-muted/20';

  return (
    <div className={clsx(
      "relative flex flex-col items-center justify-center p-3 rounded-xl backdrop-blur-md transition-all duration-300",
      // Fixed sizing for stability
      isRoot ? 'w-28 h-28' : 'w-24 h-24',
      // Style logic
      selected 
        ? 'border-2 border-primary bg-background/80 shadow-xl z-50' 
        : clsx("hover:scale-105 hover:bg-white/5", colorStyle) // Minimal background for glass effect
    )}>
      {/* Incoming Handle - Left side for devices */}
        <Handle 
          type="target" 
          position={Position.Left} 
          className="w-1 h-1 !bg-transparent !border-0"
        />
      
      {/* Outgoing Handle - Right side for server/gateway */}
        <Handle 
          type="source" 
          position={Position.Right} 
          className="w-1 h-1 !bg-transparent !border-0"
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
        isOnline ? "bg-background/30" : "bg-muted/30",
        selected ? 'scale-110' : ''
      )}>
        <Icon className={clsx(
          isRoot ? 'w-8 h-8' : 'w-6 h-6',
          isOnline ? colorStyle.split(' ')[0] : 'text-muted-foreground'
        )} />
      </div>

      {/* Label */}
      <span className={clsx(
        "text-[10px] font-bold uppercase tracking-wider text-center leading-tight px-1 transition-all duration-300",
        selected ? 'text-foreground' : 'text-foreground/70 truncate w-full'
      )}>
        {data.name}
      </span>

      {/* IP Address (Only when selected) */}
      {selected && data.ip_address && (
        <span className="text-[8px] text-muted-foreground mt-1 font-mono animate-in fade-in slide-in-from-top-1">
          {data.ip_address}
        </span>
      )}
    </div>
  );
}
