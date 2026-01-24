"use client"

import React, { useState, useEffect, useCallback } from "react";
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
    CheckCircle2, XCircle, AlertCircle, Inbox
} from 'lucide-react';
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

import { fetchPendingDeviceTypes, approveDeviceType, denyDeviceType } from "@/lib/apiClient";
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

    const handleApprove = async () => {
        if (!selectedType) return;
        try {
            await approveDeviceType(selectedType.id);
            toast.success("Device Type Approved");
            handleRemoveFromList(selectedType.id);
        } catch (e: any) {
            toast.error("Approval Failed", { description: e.message });
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
        name: "Preview Device",
        ip_address: "192.168.1.xxx",
        status: "online",
        icon: "fa-cube", // default
        current_state: {} // could partially fill default values if controls had defaults
    } : null;

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] p-4 gap-4">
             {/* Header */}
             <div className="flex items-center justify-between">
                <div>
                     <h1 className="text-2xl font-bold tracking-tight">Pending Approvals</h1>
                     <p className="text-muted-foreground">Review and audit proposed device types</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={loadPending}>Refresh</Button>
                </div>
            </div>

            {/* Main Content */}
            {isLoading ? (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">Loading...</div>
            ) : pendingTypes.length === 0 ? (
                 <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground bg-muted/20 rounded-xl border-2 border-dashed">
                    <Inbox className="w-12 h-12 mb-4 opacity-50" />
                    <p className="text-lg font-medium">No pending approvals</p>
                    <p className="text-sm opacity-75">Good job! You're all caught up.</p>
                </div>
            ) : (
                <div className="flex-1 flex gap-6 overflow-hidden">
                    {/* List (Left Sidebar for selection) */}
                    <div className="w-64 flex flex-col gap-2 overflow-y-auto pr-2 border-r">
                         {pendingTypes.map(t => (
                             <div 
                                key={t.id} 
                                onClick={() => handleSelect(t)}
                                className={`p-3 rounded-lg border cursor-pointer transition-colors ${selectedType?.id === t.id ? 'bg-primary/10 border-primary shadow-sm' : 'hover:bg-muted bg-card'}`}
                             >
                                <div className="font-semibold truncate">{t.name}</div>
                                <div className="text-xs text-muted-foreground flex justify-between mt-1">
                                    <span>{new Date(t.created_at || Date.now()).toLocaleDateString()}</span>
                                    {t.definition?.structure?.length > 0 && <Badge variant="secondary" className="text-[10px] h-4">Valid</Badge>}
                                </div>
                             </div>
                         ))}
                    </div>

                    {/* Detail View */}
                    {selectedType && (
                        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                             {/* Top Info */}
                             <div className="flex items-start justify-between bg-card p-4 rounded-lg border shadow-sm">
                                <div>
                                    <h2 className="text-xl font-bold flex items-center gap-2">
                                        {selectedType.name}
                                        <Badge status="warning">Pending</Badge>
                                    </h2>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Submitted by {selectedType.owner || "Unknown User"}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                     <Button variant="destructive" onClick={() => setIsDenyOpen(true)}>
                                        <XCircle className="w-4 h-4 mr-2" /> Deny
                                     </Button>
                                     <Button className="bg-green-600 hover:bg-green-700" onClick={handleApprove}>
                                        <CheckCircle2 className="w-4 h-4 mr-2" /> Approve
                                     </Button>
                                </div>
                             </div>

                             {/* Split View */}
                             <div className="flex-1 grid grid-cols-2 gap-4 min-h-0">
                                 {/* Panel 1: Hardware Map */}
                                 <Card className="flex flex-col overflow-hidden h-full">
                                     <CardHeader className="py-3 px-4 border-b bg-muted/40">
                                         <CardTitle className="text-sm font-medium">Hardware Topology</CardTitle>
                                     </CardHeader>
                                     <CardContent className="flex-1 p-0 relative bg-muted/10">
                                        <ReactFlowProvider>
                                            <ReactFlow
                                                nodes={nodes}
                                                edges={edges}
                                                nodeTypes={nodeTypes}
                                                fitView
                                                proOptions={{ hideAttribution: true }}
                                                nodesDraggable={false}
                                                nodesConnectable={false}
                                                elementsSelectable={false}
                                            />
                                        </ReactFlowProvider>
                                     </CardContent>
                                 </Card>

                                 {/* Panel 2: UI Preview */}
                                 <Card className="flex flex-col overflow-hidden h-full">
                                     <CardHeader className="py-3 px-4 border-b bg-muted/40">
                                         <CardTitle className="text-sm font-medium">User Interface (Preview)</CardTitle>
                                     </CardHeader>
                                     <CardContent className="flex-1 p-6 flex items-center justify-center bg-muted/20">
                                         <div className="w-full max-w-sm pointer-events-none opacity-90 hover:opacity-100 transition-opacity">
                                             <SmartDeviceCard 
                                                device={previewDevice} 
                                                deviceType={selectedType}
                                                readOnly={true}
                                             />
                                         </div>
                                     </CardContent>
                                 </Card>
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
                            Please provide a reason for rejecting this device proposal. This will be sent to the user.
                        </DialogDescription>
                    </DialogHeader>
                    <Textarea 
                        placeholder="e.g. Invalid sensor configuration..." 
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

```