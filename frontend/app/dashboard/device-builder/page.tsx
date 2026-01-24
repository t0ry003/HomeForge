"use client"

import React, { useState, useCallback, useRef, useEffect, Suspense } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { proposeDeviceType } from "@/lib/apiClient"
import { useSearchParams } from 'next/navigation'
import DeviceUICreator from './DeviceUICreator';

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
  { type: 'mcu', label: 'MCU', icon: Cpu, color: 'text-blue-500 border-blue-500/50 bg-blue-500/10', description: 'Main Controller Unit' },
  { type: 'temperature', label: 'Temp', icon: Thermometer, color: 'text-orange-500 border-orange-500/50 bg-orange-500/10', description: 'Temperature Sensor' },
  { type: 'humidity', label: 'Humidity', icon: Droplets, color: 'text-cyan-500 border-cyan-500/50 bg-cyan-500/10', description: 'Humidity Sensor' },
  { type: 'motion', label: 'Motion', icon: Activity, color: 'text-red-500 border-red-500/50 bg-red-500/10', description: 'Motion Detector' },
  { type: 'light', label: 'Light', icon: Sun, color: 'text-yellow-500 border-yellow-500/50 bg-yellow-500/10', description: 'Light Sensor' },
  { type: 'switch', label: 'Relay', icon: ToggleLeft, color: 'text-green-500 border-green-500/50 bg-green-500/10', description: 'Switch / Relay' },
  { type: 'co2', label: 'CO2', icon: Wind, color: 'text-gray-500 border-gray-500/50 bg-gray-500/10', description: 'Air Quality Sensor' },
];

// --- Custom Node Component ---
const CustomNode = ({ id, data, selected }: NodeProps) => {
  const Icon = data.icon || Cpu;
  const isMCU = data.type === 'mcu';
  const edges = useEdges();
  const { getNodes } = useReactFlow();
  
  const nodes = getNodes();
  const isAnyNodeSelected = nodes.some(n => n.selected);
  
  const isConnectedTop = edges.some(e => e.source === id); 
  const isConnectedBottom = edges.some(e => e.target === id); 
  
  const showHandles = isAnyNodeSelected;
  
  return (
    <div className={`
      relative flex flex-col items-center justify-center p-3 rounded-xl backdrop-blur-md transition-all duration-300
      ${isMCU ? 'w-28 h-28' : 'w-24 h-24'}
      ${selected 
        ? 'border-2 border-primary shadow-[0_0_20px_rgba(var(--primary),0.2)] bg-card/90' 
        : `border ${data.color || 'border-blue-500/50 text-blue-500'} bg-card/80 hover:bg-card/95 hover:scale-105 hover:shadow-lg`
      }
    `}>
      <Handle 
        type="source" 
        position={Position.Top} 
        className={`
          !w-3 !h-3 !-top-1.5 transition-all duration-200
          ${showHandles || isConnectedTop ? 'opacity-100' : 'opacity-0'}
          ${selected ? '!bg-primary' : '!bg-muted-foreground'}
        `} 
      />
      
      <div className={`absolute top-2 right-2 w-2 h-2 rounded-full ${selected ? 'bg-green-500 animate-pulse' : 'bg-muted'}`} />

      <div className={`
        p-2 rounded-full mb-2 transition-transform duration-300
        ${isMCU ? 'bg-blue-500/20' : 'bg-muted/50'}
        ${selected ? 'scale-110' : ''}
      `}>
        <Icon className={`
          ${isMCU ? 'w-8 h-8' : 'w-6 h-6'} 
          ${(data.color || '').split(' ')[0]}
        `} />
      </div>

      {!isMCU && (
        <span className={`
          text-[10px] font-bold uppercase tracking-wider text-center leading-tight
          ${selected ? 'text-foreground' : 'text-muted-foreground'}
        `}>
          {data.label}
        </span>
      )}

      <Handle 
        type="target" 
        position={Position.Bottom} 
        className={`
          !w-3 !h-3 !-bottom-1.5 transition-all duration-200
          ${showHandles || isConnectedBottom ? 'opacity-100' : 'opacity-0'}
          ${selected ? '!bg-primary' : '!bg-muted-foreground'}
        `} 
      />
    </div>
  );
};

const nodeTypes = {
  custom: CustomNode,
};

const proOptions = { hideAttribution: true };
const defaultEdgeOptions = {
  type: 'default',
  animated: true,
  style: { stroke: '#52525b', strokeWidth: 2 },
};
const connectionLineStyle = { stroke: '#60a5fa', strokeWidth: 2 };

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

// --- Helper: Structure Export (Flat with Parent Ref) ---
const buildStructure = (nodes: Node[], edges: Edge[]) => {
  return nodes.map(node => {
     // Find parent
     const parentEdge = edges.find(e => e.source === node.id);
     return {
         id: node.id,
         type: node.data.type,
         label: node.data.label,
         position: node.position,
         parentId: parentEdge ? parentEdge.target : null
     };
  });
};

// --- Helper: Structure Import (Rebuild from Flat) ---
const reconstructGraph = (structure: any[]): { nodes: Node[], edges: Edge[] } => {
    const resultNodes: Node[] = [];
    const resultEdges: Edge[] = [];

    if (!Array.isArray(structure)) return { nodes: [], edges: [] };

    structure.forEach(node => {
        const sensorDef = AVAILABLE_SENSORS.find(s => s.type === node.type);
        const rfNode: Node = {
            id: node.id,
            type: 'custom',
            position: node.position || { x: 0, y: 0 },
            data: {
                label: node.label,
                type: node.type,
                icon: sensorDef?.icon || Cpu,
                color: sensorDef?.color || 'text-gray-500 border-gray-500/50 bg-gray-500/10'
            }
        };
        resultNodes.push(rfNode);

        if (node.parentId) {
            resultEdges.push({
                id: `e-${node.id}-${node.parentId}`,
                source: node.id,
                target: node.parentId,
                animated: true,
                style: { stroke: 'var(--primary)', strokeWidth: 2 },
                markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--primary)' },
            });
        }
    });

    return { nodes: resultNodes, edges: resultEdges };
};


// --- Main Component ---
const DeviceBuilderContent = () => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [deviceName, setDeviceName] = useState("New Device");
  const [step, setStep] = useState<'nodes' | 'ui'>('nodes');
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { screenToFlowPosition, getViewport, setCenter } = useReactFlow();
  const searchParams = useSearchParams();

  // Load from URL/Props
  useEffect(() => {
    const importData = searchParams.get('import');
    if (importData) {
        try {
            const parsed = JSON.parse(decodeURIComponent(importData));
            if (parsed.structure) {
                const { nodes: loadedNodes, edges: loadedEdges } = reconstructGraph(parsed.structure);
                setNodes(loadedNodes);
                setEdges(loadedEdges);
                if (parsed.name) setDeviceName(parsed.name);
                toast.success("Loaded device definition", { id: "import-success" });
            }
        } catch (e) {
            console.error("Failed to import", e);
            toast.error("Invalid import data", { id: "import-error" });
        }
    }
  }, [searchParams, setNodes, setEdges]);
  
  // Also support a hidden window method for quick testing
  useEffect(() => {
      (window as any).loadDeviceJson = (jsonString: string) => {
          try {
             const parsed = JSON.parse(jsonString);
             if (parsed.structure) {
                 const { nodes: loadedNodes, edges: loadedEdges } = reconstructGraph(parsed.structure);
                 setNodes(loadedNodes);
                 setEdges(loadedEdges);
                 if (parsed.name) setDeviceName(parsed.name);
                 toast.success("Loaded device definition from console");
             }
          } catch(e) { console.error(e); }
      };
  }, [setNodes, setEdges]);


  // Global Touch End Handler for Mobile Drag & Drop
  useEffect(() => {
    if (step !== 'nodes') return;
    
    const handleGlobalTouchEnd = (event: TouchEvent) => {
      const type = (window as any).__draggedType;
      if (!type) return;

      const touch = event.changedTouches[0];
      const startPos = (window as any).__touchStartPos;
      
      if (startPos) {
        const dx = touch.clientX - startPos.x;
        const dy = touch.clientY - startPos.y;
        const distance = Math.sqrt(dx*dx + dy*dy);
        if (distance < 10) {
          (window as any).__draggedType = null;
          return;
        }
      }

      const position = screenToFlowPosition({
        x: touch.clientX,
        y: touch.clientY,
      });

      setNodes((currentNodes) => {
        if (type === 'mcu' && currentNodes.some(n => n.data.type === 'mcu')) {
          toast.error("Only one MCU is allowed per device");
          return currentNodes;
        }

        const sensorDef = AVAILABLE_SENSORS.find(s => s.type === type);
        if (!sensorDef) return currentNodes;

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
        
        toast.success(`Added ${sensorDef.label}`);
        return currentNodes.concat(newNode);
      });
      
      (window as any).__draggedType = null;
      (window as any).__touchStartPos = null;
    };

    window.addEventListener('touchend', handleGlobalTouchEnd);
    return () => window.removeEventListener('touchend', handleGlobalTouchEnd);
  }, [screenToFlowPosition, setNodes, step]);

  const onConnect = useCallback(
    (params: Connection) => {
      const sourceNode = nodes.find(n => n.id === params.source);
      const targetNode = nodes.find(n => n.id === params.target);
      
      let finalParams = params;

      // Enforce Sensor -> MCU direction
      if (sourceNode?.data.type === 'mcu' && targetNode?.data.type !== 'mcu') {
         finalParams = { 
           ...params, 
           source: params.target, 
           target: params.source,
         };
      }

      setEdges((eds) => addEdge({ 
        ...finalParams, 
        animated: true, 
        style: { stroke: 'var(--primary)', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--primary)' },
      }, eds));
    },
    [setEdges, nodes],
  );

  const handleAddNode = (type: SensorType) => {
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
  };

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent | React.TouchEvent) => {
      event.preventDefault();

      let type: string | null = null;
      let clientX = 0;
      let clientY = 0;

      if ('dataTransfer' in event) {
        type = event.dataTransfer.getData('application/reactflow');
        clientX = event.clientX;
        clientY = event.clientY;
      }
      
      if (!type && (window as any).__draggedType) {
        type = (window as any).__draggedType;
      }

      if (!type) return;

      if (type === 'mcu' && nodes.some(n => n.data.type === 'mcu')) {
        toast.error("Only one MCU is allowed per device");
        return;
      }

      const sensorDef = AVAILABLE_SENSORS.find(s => s.type === type);
      if (!sensorDef) return;

      if ('changedTouches' in event) {
        clientX = event.changedTouches[0].clientX;
        clientY = event.changedTouches[0].clientY;
      }

      const position = screenToFlowPosition({
        x: clientX,
        y: clientY,
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
      (window as any).__draggedType = null;
    },
    [screenToFlowPosition, nodes, setNodes],
  );

  const handleNextStep = () => {
    const validation = validateGraph(nodes, edges);
    if (!validation.valid) {
      toast.error("Invalid Configuration", {
        description: validation.error,
        icon: <AlertCircle className="w-5 h-5 text-red-500" />,
      });
      return;
    }
    setStep('ui');
  };

  const handleFinalSubmit = async (cardTemplate: any) => {
      setIsSubmitting(true);
      try {
        const structure = buildStructure(nodes, edges);
        const definition = {
            name: deviceName,
            createdAt: new Date().toISOString(),
            structure
        };
        
        console.log("Export/Proposal:", JSON.stringify({ definition, card_template: cardTemplate }, null, 2));

        await proposeDeviceType({
            name: deviceName,
            definition: definition,
            card_template: cardTemplate
        });
        
        toast.success("Device Proposal Submitted", {
            description: "An admin will review your device type."
        });
        
        // Reset 
        setNodes([]); 
        setEdges([]); 
        setStep('nodes');

      } catch (e: any) {
          // console.error(e);
          toast.error(e.message || "Failed to submit proposal");
      } finally {
          setIsSubmitting(false);
      }
  };

  const deleteSelected = useCallback(() => {
    setNodes((nds) => nds.filter((node) => !node.selected));
    setEdges((eds) => eds.filter((edge) => !edge.selected));
  }, [setNodes, setEdges]);

  const SidebarContent = () => (
    <div className="flex flex-col gap-4 h-full">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Components</div>
      <div className="grid grid-cols-2 gap-3">
        {AVAILABLE_SENSORS.map((sensor) => (
          <TooltipProvider key={sensor.type}>
            <Tooltip delayDuration={300}>
              <TooltipTrigger asChild>
                <div
                  className={`
                    flex flex-col items-center justify-center p-3 rounded-lg border border-border bg-card/30 
                    cursor-grab active:cursor-grabbing hover:bg-card hover:border-primary/50 transition-all group relative overflow-hidden
                  `}
                  onDragStart={(event) => {
                    event.dataTransfer.setData('application/reactflow', sensor.type);
                    event.dataTransfer.effectAllowed = 'move';
                    (window as any).__draggedType = sensor.type;
                  }}
                  onTouchStart={() => {
                     (window as any).__draggedType = sensor.type;
                  }}
                  draggable
                  onClick={() => handleAddNode(sensor.type)}
                >
                  <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity ${sensor.color.replace('text-', 'bg-')}`} />
                  <sensor.icon className={`w-6 h-6 mb-2 ${sensor.color.split(' ')[0]} opacity-80 group-hover:opacity-100 transition-all group-hover:scale-110`} />
                  <span className="text-[10px] font-medium text-muted-foreground group-hover:text-foreground text-center">{sensor.label}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-popover border-border text-popover-foreground">
                <p className="font-semibold text-xs mb-1">{sensor.label}</p>
                <p className="text-[10px] text-muted-foreground">{sensor.description}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>
      
      <div className="mt-auto p-4 rounded-lg bg-muted/50 border border-border">
        <div className="flex items-start gap-3">
          <MousePointerClick className="w-4 h-4 text-primary mt-1" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            <span className="text-foreground font-medium">Tip:</span> Drag components or tap to add. Ensure all nodes connect to the MCU.
          </p>
        </div>
      </div>
    </div>
  );

  if (step === 'ui') {
      return (
        <DeviceUICreator 
            nodes={nodes} 
            onBack={() => setStep('nodes')}
            onSave={handleFinalSubmit}
            isSubmitting={isSubmitting}
        />
      );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header Toolbar */}
      <div className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-border bg-background backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-foreground">
            <div className="p-1.5 rounded-md bg-primary/10 hidden md:block">
              <Cpu className="w-4 h-4 text-primary" />
            </div>
            <span className="font-semibold tracking-tight hidden sm:inline">Device Builder</span>
          </div>
          <div className="h-4 w-px bg-border hidden md:block" />
          <Input 
            value={deviceName}
            onChange={(e) => setDeviceName(e.target.value)}
            className="h-8 w-40 md:w-64 bg-muted/50 border-border text-foreground focus-visible:ring-primary/50 transition-all focus:bg-background"
            placeholder="Device Name"
          />
        </div>
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={deleteSelected} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete Selected</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Button size="sm" onClick={handleNextStep} className="bg-primary hover:bg-primary/90 text-primary-foreground border-0 shadow-lg shadow-primary/20">
            <span className="hidden sm:inline">Next: UI Builder</span>
            <span className="sm:inline hidden">Next</span>
            <CheckCircle2 className="w-4 h-4 sm:ml-2" />
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative md:p-4 bg-background/20">
        <div className="flex w-full h-full md:rounded-2xl overflow-hidden md:border md:border-border bg-background shadow-2xl relative">
          <div className="w-72 border-r border-border p-4 hidden md:block overflow-y-auto bg-card/30 backdrop-blur-xl">
            <SidebarContent />
          </div>

          <div 
            className="flex-1 h-full relative" 
            ref={reactFlowWrapper}
          >
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
              translateExtent={[[-500, -500], [1500, 1500]]} 
              minZoom={0.5}
              maxZoom={2}
              proOptions={proOptions}
              deleteKeyCode={['Backspace', 'Delete']}
              defaultEdgeOptions={defaultEdgeOptions}
              connectionLineStyle={connectionLineStyle}
              selectionOnDrag
            >
              <Background color="var(--muted-foreground)" gap={24} size={1} variant="dots" className="opacity-20" />
              <Controls 
                className="!bg-card/80 !border-border !shadow-xl !rounded-lg overflow-hidden [&>button]:!bg-transparent [&>button]:!border-0 [&>button]:!fill-muted-foreground [&>button:hover]:!bg-muted [&>button:hover]:!fill-foreground" 
              />
              <Panel position="bottom-center" className="md:hidden mb-8 z-50">
                <Button 
                  onClick={() => setIsSheetOpen(true)}
                  className="rounded-full w-14 h-14 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/40 p-0 flex items-center justify-center transition-transform active:scale-95"
                >
                  <Plus className="w-7 h-7 text-primary-foreground" />
                </Button>
              </Panel>
            </ReactFlow>
          </div>
        </div>
      </div>

      <div className={`fixed inset-0 z-[60] md:hidden pointer-events-none`}>
        <div 
          className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${isSheetOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0'}`}
          onClick={() => setIsSheetOpen(false)}
        />
        
        <div className={`
          absolute bottom-0 left-0 right-0 
          bg-card border-t border-border rounded-t-3xl
          transition-transform duration-300 ease-out pointer-events-auto
          ${isSheetOpen ? 'translate-y-0' : 'translate-y-full'}
          shadow-2xl pb-8
        `}>
          <div className="p-6">
            <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mb-8" />
            
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
                    onTouchStart={(e) => {
                       (window as any).__draggedType = sensor.type;
                       (window as any).__touchStartPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
                       setIsSheetOpen(false);
                    }}
                  >
                    <sensor.icon className={`w-8 h-8 ${sensor.color.split(' ')[0]}`} />
                  </div>
                  <span className="text-[10px] font-medium text-muted-foreground text-center leading-tight">
                    {sensor.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function DeviceBuilderPage() {
  return (
     <Suspense fallback={<div>Loading Builder...</div>}>
         <ReactFlowProvider>
          <DeviceBuilderContent />
        </ReactFlowProvider>
    </Suspense>
  );
}
