"use client"

import React, { useState, useCallback, useRef, useEffect } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  Connection,
  Edge,
  Node,
  Panel,
  Handle,
  Position,
  NodeProps,
  MarkerType,
  useReactFlow,
  useEdges,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { toast } from "sonner";
import { 
  Save, 
  Cpu, 
  Thermometer, 
  Droplets, 
  Activity, 
  Sun, 
  ToggleLeft, 
  Wind, 
  Plus,
  Trash2,
  Menu,
  Zap,
  AlertCircle,
  CheckCircle2,
  MousePointerClick
} from 'lucide-react';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// --- Types ---
type SensorType = 'mcu' | 'temperature' | 'humidity' | 'motion' | 'light' | 'switch' | 'co2';

interface SensorDefinition {
  type: SensorType;
  label: string;
  icon: React.ElementType;
  color: string;
  description: string;
}

const AVAILABLE_SENSORS: SensorDefinition[] = [
  { type: 'mcu', label: 'MCU', icon: Cpu, color: 'text-blue-400 border-blue-500/50 bg-blue-500/10', description: 'Main Controller Unit' },
  { type: 'temperature', label: 'Temp', icon: Thermometer, color: 'text-orange-400 border-orange-500/50 bg-orange-500/10', description: 'Temperature Sensor' },
  { type: 'humidity', label: 'Humidity', icon: Droplets, color: 'text-cyan-400 border-cyan-500/50 bg-cyan-500/10', description: 'Humidity Sensor' },
  { type: 'motion', label: 'Motion', icon: Activity, color: 'text-red-400 border-red-500/50 bg-red-500/10', description: 'Motion Detector' },
  { type: 'light', label: 'Light', icon: Sun, color: 'text-yellow-400 border-yellow-500/50 bg-yellow-500/10', description: 'Light Sensor' },
  { type: 'switch', label: 'Relay', icon: ToggleLeft, color: 'text-green-400 border-green-500/50 bg-green-500/10', description: 'Switch / Relay' },
  { type: 'co2', label: 'CO2', icon: Wind, color: 'text-gray-400 border-gray-500/50 bg-gray-500/10', description: 'Air Quality Sensor' },
];

// --- Custom Node Component ---
const CustomNode = ({ id, data, selected }: NodeProps) => {
  const Icon = data.icon;
  const isMCU = data.type === 'mcu';
  const edges = useEdges();
  const { getNodes } = useReactFlow();
  
  // Check if ANY node is selected to show handles on all nodes
  const nodes = getNodes();
  const isAnyNodeSelected = nodes.some(n => n.selected);
  
  // Check if handles are connected
  const isConnectedTop = edges.some(e => e.target === id);
  const isConnectedBottom = edges.some(e => e.source === id);
  
  // Show handles if: 
  // 1. This node is selected
  // 2. ANY node is selected (so we can connect TO this node)
  // 3. The handle is already connected (to show the circuit)
  const showHandles = selected || isAnyNodeSelected;
  
  return (
    <div className={`
      relative flex flex-col items-center justify-center p-3 rounded-xl backdrop-blur-md transition-all duration-300
      ${isMCU ? 'w-28 h-28' : 'w-24 h-24'}
      ${selected 
        ? 'border-2 border-white shadow-[0_0_20px_rgba(255,255,255,0.2)] bg-zinc-900/90' 
        : `border ${data.color} bg-zinc-900/80 hover:bg-zinc-900/95 hover:scale-105 hover:shadow-lg`
      }
    `}>
      {/* Connection Handles */}
      <Handle 
        type="target" 
        position={Position.Top} 
        className={`
          !w-3 !h-3 !-top-1.5 transition-all duration-200
          ${showHandles || isConnectedTop ? 'opacity-100' : 'opacity-0'}
          ${selected ? '!bg-white' : '!bg-zinc-500'}
        `} 
      />
      
      {/* Status Indicator */}
      <div className={`absolute top-2 right-2 w-2 h-2 rounded-full ${selected ? 'bg-green-400 animate-pulse' : 'bg-zinc-700'}`} />

      {/* Icon */}
      <div className={`
        p-2 rounded-full mb-2 transition-transform duration-300
        ${isMCU ? 'bg-blue-500/20' : 'bg-zinc-800/50'}
        ${selected ? 'scale-110' : ''}
      `}>
        <Icon className={`
          ${isMCU ? 'w-8 h-8' : 'w-6 h-6'} 
          ${data.color.split(' ')[0]}
        `} />
      </div>

      {/* Label */}
      <span className={`
        text-[10px] font-bold uppercase tracking-wider text-center leading-tight
        ${selected ? 'text-white' : 'text-zinc-400'}
      `}>
        {data.label}
      </span>

      {isMCU && (
        <Badge variant="outline" className="absolute -bottom-3 text-[8px] h-4 px-1 bg-zinc-950 border-blue-500/50 text-blue-400">
          CORE
        </Badge>
      )}

      <Handle 
        type="source" 
        position={Position.Bottom} 
        className={`
          !w-3 !h-3 !-bottom-1.5 transition-all duration-200
          ${showHandles || isConnectedBottom ? 'opacity-100' : 'opacity-0'}
          ${selected ? '!bg-white' : '!bg-zinc-500'}
        `} 
      />
    </div>
  );
};

const nodeTypes = {
  custom: CustomNode,
};

// --- Helper: Graph Validation ---
const validateGraph = (nodes: Node[], edges: Edge[]) => {
  if (nodes.length === 0) return { valid: false, error: "Canvas is empty" };

  const mcu = nodes.find(n => n.data.type === 'mcu');
  if (!mcu) return { valid: false, error: "Missing MCU (Main Controller Unit)" };

  // Check connectivity (Undirected BFS)
  const adj = new Map<string, string[]>();
  nodes.forEach(n => adj.set(n.id, []));
  edges.forEach(e => {
    adj.get(e.source)?.push(e.target);
    adj.get(e.target)?.push(e.source);
  });

  const visited = new Set<string>();
  const queue = [mcu.id];
  visited.add(mcu.id);

  while (queue.length > 0) {
    const curr = queue.shift()!;
    const neighbors = adj.get(curr) || [];
    for (const n of neighbors) {
      if (!visited.has(n)) {
        visited.add(n);
        queue.push(n);
      }
    }
  }

  if (visited.size !== nodes.length) {
    return { valid: false, error: "All components must be connected to the MCU" };
  }

  return { valid: true };
};

// --- Helper: Hierarchical Export ---
const buildHierarchy = (nodes: Node[], edges: Edge[]) => {
  const targets = new Set(edges.map(e => e.target));
  const roots = nodes.filter(n => !targets.has(n.id));

  const buildNode = (node: Node): any => {
    const childEdges = edges.filter(e => e.source === node.id);
    const children = childEdges.map(e => {
      const childNode = nodes.find(n => n.id === e.target);
      return childNode ? buildNode(childNode) : null;
    }).filter(Boolean);

    return {
      id: node.id,
      type: node.data.type,
      label: node.data.label,
      position: node.position,
      ...(children.length > 0 && { children }),
    };
  };

  return roots.map(buildNode);
};

// --- Main Component ---
const DeviceBuilderContent = () => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [deviceName, setDeviceName] = useState("New Device");
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const { screenToFlowPosition, getViewport, setCenter } = useReactFlow();

  // Auto-add MCU on start if empty? 
  // The user said "always add the MCU to the middle". 
  // We'll provide a clear way to do it, but maybe not force it on load to avoid annoyance if they want to load a save.
  // However, we can check on mount.

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ 
      ...params, 
      animated: true, 
      style: { stroke: '#60a5fa', strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#60a5fa' },
    }, eds)),
    [setEdges],
  );

  const handleAddNode = (type: SensorType) => {
    // 1. Enforce Single MCU
    if (type === 'mcu') {
      const mcuExists = nodes.some(n => n.data.type === 'mcu');
      if (mcuExists) {
        toast.error("Only one MCU is allowed per device");
        return;
      }
    }

    const sensorDef = AVAILABLE_SENSORS.find(s => s.type === type);
    if (!sensorDef) return;

    let position = { x: 0, y: 0 };
    
    // 2. Calculate Center
    if (reactFlowWrapper.current) {
      const { x, y, zoom } = getViewport();
      const { width, height } = reactFlowWrapper.current.getBoundingClientRect();
      position = {
        x: (-x + width / 2) / zoom - 50,
        y: (-y + height / 2) / zoom - 50,
      };
    }

    const newNode: Node = {
      id: `${type}-${Date.now()}`,
      type: 'custom',
      position,
      data: { 
        label: sensorDef.label, 
        type: sensorDef.type,
        icon: sensorDef.icon,
        color: sensorDef.color 
      },
    };

    setNodes((nds) => nds.concat(newNode));
    setIsSheetOpen(false);
    toast.success(`Added ${sensorDef.label}`);
    
    // If it's an MCU, maybe zoom to it?
    if (type === 'mcu') {
      // Optional: Center view on MCU
      // setCenter(position.x, position.y, { zoom: 1.2, duration: 800 });
    }
  };

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      if (!type) return;

      // Enforce Single MCU on Drop too
      if (type === 'mcu' && nodes.some(n => n.data.type === 'mcu')) {
        toast.error("Only one MCU is allowed per device");
        return;
      }

      const sensorDef = AVAILABLE_SENSORS.find(s => s.type === type);
      if (!sensorDef) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: Node = {
        id: `${type}-${Date.now()}`,
        type: 'custom',
        position,
        data: { 
          label: sensorDef.label, 
          type: sensorDef.type,
          icon: sensorDef.icon,
          color: sensorDef.color 
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [screenToFlowPosition, nodes, setNodes],
  );

  const handleExport = () => {
    // 3. Validation
    const validation = validateGraph(nodes, edges);
    if (!validation.valid) {
      toast.error("Validation Failed", {
        description: validation.error,
        icon: <AlertCircle className="w-5 h-5 text-red-500" />,
      });
      return;
    }

    const hierarchy = buildHierarchy(nodes, edges);
    const exportData = {
      name: deviceName,
      createdAt: new Date().toISOString(),
      structure: hierarchy
    };
    console.log("Exported Hierarchy:", JSON.stringify(exportData, null, 2));
    toast.success("Device saved successfully!", {
      description: "Configuration exported to console.",
      icon: <CheckCircle2 className="w-5 h-5 text-green-500" />,
    });
  };

  const deleteSelected = useCallback(() => {
    setNodes((nds) => nds.filter((node) => !node.selected));
    setEdges((eds) => eds.filter((edge) => !edge.selected));
  }, [setNodes, setEdges]);

  const clearCanvas = () => {
    if (confirm("Are you sure you want to clear the canvas?")) {
      setNodes([]);
      setEdges([]);
    }
  };

  const SidebarContent = () => (
    <div className="flex flex-col gap-4 h-full">
      <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Components</div>
      <div className="grid grid-cols-2 gap-3">
        {AVAILABLE_SENSORS.map((sensor) => (
          <TooltipProvider key={sensor.type}>
            <Tooltip delayDuration={300}>
              <TooltipTrigger asChild>
                <div
                  className={`
                    flex flex-col items-center justify-center p-3 rounded-lg border border-zinc-800 bg-zinc-900/30 
                    cursor-grab active:cursor-grabbing hover:bg-zinc-900 hover:border-zinc-700 transition-all group relative overflow-hidden
                  `}
                  onDragStart={(event) => {
                    event.dataTransfer.setData('application/reactflow', sensor.type);
                    event.dataTransfer.effectAllowed = 'move';
                  }}
                  draggable
                  onClick={() => handleAddNode(sensor.type)}
                >
                  <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity ${sensor.color.replace('text-', 'bg-')}`} />
                  <sensor.icon className={`w-6 h-6 mb-2 ${sensor.color.split(' ')[0]} opacity-80 group-hover:opacity-100 transition-all group-hover:scale-110`} />
                  <span className="text-[10px] font-medium text-zinc-400 group-hover:text-zinc-200 text-center">{sensor.label}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-zinc-900 border-zinc-800 text-zinc-300">
                <p className="font-semibold text-xs mb-1">{sensor.label}</p>
                <p className="text-[10px] text-zinc-500">{sensor.description}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>
      
      <div className="mt-auto p-4 rounded-lg bg-zinc-900/50 border border-zinc-800">
        <div className="flex items-start gap-3">
          <MousePointerClick className="w-4 h-4 text-blue-400 mt-1" />
          <p className="text-xs text-zinc-500 leading-relaxed">
            <span className="text-zinc-300 font-medium">Tip:</span> Drag components or tap to add. Ensure all nodes connect to the MCU.
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header Toolbar */}
      <div className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-zinc-800 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10">
        <div className="flex items-center gap-4">
          {/* Mobile Menu Trigger Removed - Use Bottom FAB */}
          
          <div className="flex items-center gap-2 text-zinc-100">
            <div className="p-1.5 rounded-md bg-blue-500/10 hidden md:block">
              <Cpu className="w-4 h-4 text-blue-500" />
            </div>
            <span className="font-semibold tracking-tight hidden sm:inline">Device Builder</span>
          </div>
          <div className="h-4 w-px bg-zinc-800 hidden md:block" />
          <Input 
            value={deviceName}
            onChange={(e) => setDeviceName(e.target.value)}
            className="h-8 w-40 md:w-64 bg-zinc-900/50 border-zinc-800 text-zinc-100 focus-visible:ring-blue-500/50 transition-all focus:bg-zinc-900"
            placeholder="Device Name"
          />
        </div>
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={deleteSelected} className="text-zinc-400 hover:text-red-400 hover:bg-red-400/10">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete Selected</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Button size="sm" onClick={handleExport} className="bg-blue-600 hover:bg-blue-500 text-white border-0 shadow-lg shadow-blue-900/20">
            <Save className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Save Device</span>
            <span className="sm:hidden">Save</span>
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative md:p-4 bg-zinc-950/50">
        <div className="flex w-full h-full md:rounded-2xl overflow-hidden md:border md:border-zinc-800 bg-background shadow-2xl relative">
          {/* Desktop Sidebar Palette */}
          <div className="w-72 border-r border-zinc-800 p-4 hidden md:block overflow-y-auto bg-zinc-950/30 backdrop-blur-xl">
            <SidebarContent />
          </div>

          {/* React Flow Canvas */}
          <div className="flex-1 h-full relative" ref={reactFlowWrapper}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onDrop={onDrop}
              onDragOver={onDragOver}
              nodeTypes={nodeTypes}
              fitView
              proOptions={{ hideAttribution: true }}
              deleteKeyCode={['Backspace', 'Delete']}
              defaultEdgeOptions={{
                type: 'default',
                animated: true,
                style: { stroke: '#52525b', strokeWidth: 2 },
              }}
              connectionLineStyle={{ stroke: '#60a5fa', strokeWidth: 2 }}
              selectionOnDrag
            >
              <Background color="#27272a" gap={24} size={1} variant="dots" />
              <Controls 
                className="!bg-zinc-900/80 !border-zinc-800 !shadow-xl !rounded-lg overflow-hidden [&>button]:!bg-transparent [&>button]:!border-0 [&>button]:!fill-zinc-400 [&>button:hover]:!bg-zinc-800 [&>button:hover]:!fill-zinc-100" 
              />
              <Panel position="bottom-center" className="md:hidden mb-8 z-50">
                <Button 
                  onClick={() => setIsSheetOpen(true)}
                  className="rounded-full w-14 h-14 bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-900/40 p-0 flex items-center justify-center transition-transform active:scale-95"
                >
                  <Plus className="w-7 h-7 text-white" />
                </Button>
              </Panel>
              
              {/* Mobile Bottom Sheet */}
              <div className={`fixed inset-0 z-[60] md:hidden pointer-events-none`}>
                {/* Backdrop */}
                <div 
                  className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${isSheetOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0'}`}
                  onClick={() => setIsSheetOpen(false)}
                />
                
                {/* Sheet Content */}
                <div className={`
                  absolute bottom-0 left-0 right-0 
                  bg-zinc-900 border-t border-zinc-800 rounded-t-3xl
                  transition-transform duration-300 ease-out pointer-events-auto
                  ${isSheetOpen ? 'translate-y-0' : 'translate-y-full'}
                  shadow-2xl pb-8
                `}>
                  <div className="p-6">
                    <div className="w-12 h-1.5 bg-zinc-800 rounded-full mx-auto mb-8" />
                    
                    <div className="grid grid-cols-4 gap-4">
                      {AVAILABLE_SENSORS.map((sensor) => (
                        <div
                          key={sensor.type}
                          className="flex flex-col items-center gap-2 group"
                          onClick={() => handleAddNode(sensor.type)}
                        >
                          <div 
                            className={`
                              w-16 h-16 rounded-xl flex items-center justify-center
                              border backdrop-blur-sm
                              ${sensor.color}
                              shadow-lg transition-all active:scale-95
                            `}
                            draggable
                            onDragStart={(event) => {
                              setIsSheetOpen(false);
                              event.dataTransfer.setData('application/reactflow', sensor.type);
                              event.dataTransfer.effectAllowed = 'move';
                            }}
                          >
                            <sensor.icon className={`w-8 h-8 ${sensor.color.split(' ')[0]}`} />
                          </div>
                          <span className="text-[10px] font-medium text-zinc-400 text-center leading-tight">
                            {sensor.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </ReactFlow>
          </div>
        </div>
      </div>
    </div>
  );
};

// Wrap in Provider for useReactFlow hook
export default function DeviceBuilderPage() {
  return (
    <ReactFlowProvider>
      <DeviceBuilderContent />
    </ReactFlowProvider>
  );
}
