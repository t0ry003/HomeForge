"use client"

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import ReactFlow, {
    useNodesState,
    useEdgesState,
    ReactFlowProvider,
    Node,
    Edge,
    MarkerType,
    NodeProps,
    Position,
    Handle
} from 'reactflow';
import 'reactflow/dist/style.css';

import { 
    Cpu, Thermometer, Droplets, Activity, Sun, ToggleLeft, Wind, 
    CheckCircle2, XCircle, Inbox, RotateCw
} from 'lucide-react';
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

import { fetchPendingDeviceTypes, denyDeviceType, approveDeviceType } from "@/lib/apiClient";
import SmartDeviceCard from "@/components/devices/SmartDeviceCard";

// --- Graph Definitions (Copied from Builder) ---

type SensorType = 'mcu' | 'temperature' | 'humidity' | 'motion' | 'light' | 'switch' | 'co2';

const AVAILABLE_SENSORS: any[] = [
  { type: 'mcu', label: 'MCU', icon: Cpu, color: 'text-blue-500 border-blue-500/50 bg-blue-500/10' },
  { type: 'temperature', label: 'Temp', icon: Thermometer, color: 'text-orange-500 border-orange-500/50 bg-orange-500/10' },
  { type: 'humidity', label: 'Humidity', icon: Droplets, color: 'text-cyan-500 border-cyan-500/50 bg-cyan-500/10' },
  { type: 'motion', label: 'Motion', icon: Activity, color: 'text-red-500 border-red-500/50 bg-red-500/10' },
  { type: 'light', label: 'Light', icon: Sun, color: 'text-yellow-500 border-yellow-500/50 bg-yellow-500/10' },
  { type: 'switch', label: 'Relay', icon: ToggleLeft, color: 'text-green-500 border-green-500/50 bg-green-500/10' },
  { type: 'co2', label: 'CO2', icon: Wind, color: 'text-gray-500 border-gray-500/50 bg-gray-500/10' },
];

const CustomNode = ({ data }: NodeProps) => {
  const Icon = data.icon || Cpu;
  const isMCU = data.type === 'mcu';

  return (
    <div className={`
      relative flex flex-col items-center justify-center p-3 rounded-xl backdrop-blur-md
      ${isMCU ? 'w-24 h-24' : 'w-20 h-20'}
      border ${data.color || 'border-blue-500/50 text-blue-500'} bg-card/80
    `}>
       <Handle type="source" position={Position.Top} className="!bg-muted-foreground opacity-20" />
      <div className={`p-2 rounded-full mb-1 ${isMCU ? 'bg-blue-500/20' : 'bg-muted/50'}`}>
        <Icon className={`${isMCU ? 'w-6 h-6' : 'w-5 h-5'} ${(data.color || '').split(' ')[0]}`} />
      </div>
      {!isMCU && (
        <span className="text-[9px] font-bold uppercase tracking-wider text-center leading-tight">
          {data.label}
        </span>
      )}
      <Handle type="target" position={Position.Bottom} className="!bg-muted-foreground opacity-20" />
    </div>
  );
};

const nodeTypes = { custom: CustomNode };

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
                color: sensorDef?.color
            },
            draggable: false, 
            connectable: false
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
                focusable: false
            });
        }
    });

    return { nodes: resultNodes, edges: resultEdges };
};


export default function AdminApprovalsPage() {
    const router = useRouter();
    const [pendingTypes, setPendingTypes] = useState<any[]>([]);
    const [selectedType, setSelectedType] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    
    // Graph State
    const [nodes, setNodes] = useNodesState([]);
    const [edges, setEdges] = useEdgesState([]);

    // Modal State
    const [denyReason, setDenyReason] = useState("");
    const [isDenyOpen, setIsDenyOpen] = useState(false);

    // Fetch Data
    const loadPending = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await fetchPendingDeviceTypes();
            // Handle pagination or list
            const raw = Array.isArray(res) ? res : (res.results || []);
            setPendingTypes(raw);
            if (raw.length > 0 && !selectedType) {
                // Auto-select first if none selected
                handleSelect(raw[0]);
            } else if (raw.length === 0) {
                setSelectedType(null);
            }
        } catch (e: any) {
            toast.error("Failed to load requests", { description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [selectedType]);

    useEffect(() => {
        loadPending();
    }, []);

    const handleSelect = (item: any) => {
        setSelectedType(item);
        if (item.definition?.structure) {
            const { nodes: flatNodes, edges: flatEdges } = reconstructGraph(item.definition.structure);
            setNodes(flatNodes);
            setEdges(flatEdges);
        } else {
            setNodes([]);
            setEdges([]);
        }
    };

    const handleDeny = async () => {
        if (!selectedType || !denyReason) return;
        try {
            await denyDeviceType(selectedType.id, denyReason);
            toast.success("Device Type Denied");
            setIsDenyOpen(false);
            setDenyReason("");
            handleRemoveFromList(selectedType.id);
        } catch (e: any) {
            toast.error("Denial Failed", { description: e.message });
        }
    };

    const handleApprove = async () => {
        if (!selectedType) return;
        try {
            await approveDeviceType(selectedType.id);
            toast.success("Device Type Approved", { description: `${selectedType.name} is now available for use.` });
            handleRemoveFromList(selectedType.id);
        } catch (e: any) {
            toast.error("Approval Failed", { description: e.message });
        }
    };

    const handleRemoveFromList = (id: string) => {
        const remaining = pendingTypes.filter(p => p.id !== id);
        setPendingTypes(remaining);
        if (remaining.length > 0) {
            handleSelect(remaining[0]);
        } else {
            setSelectedType(null);
        }
    };

    // Mock Device for Preview
    const previewDevice = selectedType ? {
        id: "preview-123",
        name: selectedType.name || "Preview Device",
        ip_address: "192.168.1.xxx",
        status: "online",
        icon: selectedType.definition?.icon || "fa-cube",
        current_state: {}
    } : null;

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] gap-4 p-4 md:p-6">
             {/* Header */}
             <div className="flex items-center justify-between shrink-0">
                <div>
                     <h1 className="text-2xl font-bold tracking-tight">Pending Approvals</h1>
                     <p className="text-sm text-muted-foreground">Review and approve device type definitions</p>
                </div>
                <Button variant="outline" size="sm" onClick={loadPending} disabled={isLoading}>
                    <RotateCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {/* Main Content */}
            {isLoading ? (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                    <RotateCw className="w-5 h-5 animate-spin mr-2" />
                    Loading pending approvals...
                </div>
            ) : pendingTypes.length === 0 ? (
                 <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground rounded-xl border border-dashed bg-muted/5">
                    <div className="p-4 rounded-full bg-muted/20 mb-4">
                        <Inbox className="w-10 h-10 opacity-50" />
                    </div>
                    <p className="text-lg font-medium">No pending approvals</p>
                    <p className="text-sm opacity-75">All device types have been reviewed</p>
                </div>
            ) : (
                <div className="flex-1 flex flex-col lg:flex-row gap-4 overflow-hidden min-h-0">
                    {/* Left Panel: Pending List */}
                    <div className="w-full lg:w-64 flex flex-col gap-2 overflow-y-auto shrink-0 lg:pr-2">
                        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                            {pendingTypes.length} pending
                        </div>
                        <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0">
                         {pendingTypes.map(t => (
                             <div 
                                key={t.id} 
                                onClick={() => handleSelect(t)}
                                className={`cursor-pointer transition-all p-3 rounded-lg border min-w-[200px] lg:min-w-0 ${
                                    selectedType?.id === t.id 
                                        ? 'border-primary bg-primary/5 shadow-sm' 
                                        : 'border-border bg-card hover:bg-muted/50'
                                }`}
                             >
                                <div className="flex items-center justify-between gap-2">
                                    <span className="font-medium text-sm truncate">{t.name}</span>
                                    <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] shrink-0 px-1.5 py-0">
                                        Pending
                                    </Badge>
                                </div>
                                <div className="text-xs text-muted-foreground mt-1.5">
                                    {t.definition?.structure?.length || 0} component{(t.definition?.structure?.length || 0) !== 1 ? 's' : ''} · {new Date(t.created_at || Date.now()).toLocaleDateString()}
                                </div>
                             </div>
                         ))}
                        </div>
                    </div>

                    {/* Right Panel: Detail View */}
                    {selectedType && (
                        <div className="flex-1 flex flex-col gap-4 overflow-hidden min-h-0 lg:border-l lg:pl-4">
                             {/* Header with Actions */}
                             <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
                                <div>
                                    <h2 className="text-lg font-bold">{selectedType.name}</h2>
                                    {(selectedType.owner || selectedType.created_by?.username) && (
                                        <p className="text-xs text-muted-foreground">
                                            by {selectedType.owner || selectedType.created_by?.username}
                                        </p>
                                    )}
                                </div>
                                <div className="flex gap-2 w-full sm:w-auto">
                                     <Button variant="outline" size="sm" className="flex-1 sm:flex-none border-red-500/30 text-red-600 hover:bg-red-500/10 hover:text-red-600" onClick={() => setIsDenyOpen(true)}>
                                        <XCircle className="w-4 h-4 mr-1.5" /> Deny
                                     </Button>
                                     <Button size="sm" className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700" onClick={handleApprove}>
                                        <CheckCircle2 className="w-4 h-4 mr-1.5" /> Approve
                                     </Button>
                                </div>
                             </div>

                             {/* Preview Panels - Stacked on smaller, side by side on larger */}
                             <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0 overflow-auto">
                                 {/* Panel 1: Hardware Topology */}
                                 <div className="flex flex-col rounded-lg border bg-card overflow-hidden min-h-[300px]">
                                     <div className="py-2 px-3 border-b bg-muted/30 shrink-0">
                                         <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Hardware Topology</span>
                                     </div>
                                     <div className="flex-1 relative">
                                        <ReactFlowProvider key={selectedType?.id}>
                                            <ReactFlow
                                                nodes={nodes}
                                                edges={edges}
                                                nodeTypes={nodeTypes}
                                                fitView
                                                fitViewOptions={{ padding: 0.3 }}
                                                proOptions={{ hideAttribution: true }}
                                                nodesDraggable={false}
                                                nodesConnectable={false}
                                                elementsSelectable={false}
                                                className="bg-background"
                                            />
                                        </ReactFlowProvider>
                                     </div>
                                 </div>

                                 {/* Panel 2: UI Preview */}
                                 <div className="flex flex-col rounded-lg border bg-card overflow-hidden min-h-[300px]">
                                     <div className="py-2 px-3 border-b bg-muted/30 shrink-0">
                                         <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Card Preview</span>
                                     </div>
                                     <div className="flex-1 p-4 flex items-center justify-center overflow-auto bg-background">
                                         <div className="w-full max-w-xs pointer-events-none">
                                             <SmartDeviceCard 
                                                device={previewDevice} 
                                                deviceType={selectedType}
                                                readOnly={true}
                                             />
                                         </div>
                                     </div>
                                 </div>
                             </div>
                        </div>
                    )}
                </div>
            )}

            {/* Deny Modal */}
            <Dialog open={isDenyOpen} onOpenChange={setIsDenyOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Deny Device Type</DialogTitle>
                        <DialogDescription>
                            Please provide a reason for rejecting &quot;{selectedType?.name}&quot;. This will be sent to the creator.
                        </DialogDescription>
                    </DialogHeader>
                    <Textarea 
                        placeholder="e.g. Invalid sensor configuration, missing controls..." 
                        value={denyReason}
                        onChange={(e) => setDenyReason(e.target.value)}
                        className="min-h-[100px]"
                    />
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDenyOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleDeny} disabled={!denyReason.trim()}>Confirm Denial</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
