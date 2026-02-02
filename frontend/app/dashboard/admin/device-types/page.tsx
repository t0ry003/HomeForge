"use client"

import React, { useState, useCallback, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
    CheckCircle2, XCircle, Inbox, RotateCw, Plus, Edit, Trash2,
    AlertTriangle, CheckSquare, Square, Filter
} from 'lucide-react';
import { toast } from "sonner";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { 
    fetchDeviceTypes,
    fetchPendingDeviceTypes, 
    fetchDeniedDeviceTypes,
    approveDeviceType, 
    denyDeviceType,
    deleteDeviceType,
    deleteDeniedDeviceType,
    bulkDeleteDeniedDeviceTypes,
    updateAdminDeviceType
} from "@/lib/apiClient";
import SmartDeviceCard from "@/components/devices/SmartDeviceCard";
import { useIsMobile } from "@/hooks/use-mobile";
import { ScrollArea } from "@/components/ui/scroll-area";

// --- Status Types ---
type StatusFilter = 'all' | 'approved' | 'pending' | 'denied';

// --- Graph Definitions ---
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

// --- Badge component for status ---
function StatusBadge({ status }: { status: 'approved' | 'pending' | 'denied' }) {
    const variants = {
        approved: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30',
        pending: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
        denied: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30',
    };
    const labels = { approved: 'Approved', pending: 'Pending', denied: 'Denied' };
    
    return (
        <Badge variant="secondary" className={`${variants[status]} text-[10px] shrink-0 px-1.5 py-0`}>
            {labels[status]}
        </Badge>
    );
}

export default function DeviceTypesManagementPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const queryClient = useQueryClient();
    const isMobile = useIsMobile();
    
    // Get initial filter from URL query params
    const initialFilter = (searchParams.get('filter') as StatusFilter) || 'all';
    
    // Filter state
    const [statusFilter, setStatusFilter] = useState<StatusFilter>(initialFilter);
    const [selectedType, setSelectedType] = useState<any>(null);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    
    // Graph State
    const [nodes, setNodes] = useNodesState([]);
    const [edges, setEdges] = useEdgesState([]);

    // Modal State
    const [denyReason, setDenyReason] = useState("");
    const [isDenyOpen, setIsDenyOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
    const [editName, setEditName] = useState("");
    const [isEditingName, setIsEditingName] = useState(false);

    // Fetch all device types
    const { data: approvedTypes = [], isLoading: loadingApproved } = useQuery({
        queryKey: ['deviceTypes'],
        queryFn: async () => {
            const res = await fetchDeviceTypes();
            return Array.isArray(res) ? res : (res.results || []);
        },
        staleTime: 30000,
        gcTime: 5 * 60 * 1000,
    });

    // Fetch pending types
    const { data: pendingTypes = [], isLoading: loadingPending } = useQuery({
        queryKey: ['pendingDeviceTypes'],
        queryFn: async () => {
            const res = await fetchPendingDeviceTypes();
            return Array.isArray(res) ? res : (res.results || []);
        },
        staleTime: 30000,
        gcTime: 5 * 60 * 1000,
    });

    // Fetch denied types
    const { data: deniedTypes = [], isLoading: loadingDenied } = useQuery({
        queryKey: ['deniedDeviceTypes'],
        queryFn: async () => {
            const res = await fetchDeniedDeviceTypes();
            return Array.isArray(res) ? res : (res.results || []);
        },
        staleTime: 30000,
        gcTime: 5 * 60 * 1000,
    });

    const isLoading = loadingApproved || loadingPending || loadingDenied;

    // Combine and filter all types
    const allTypes = useMemo(() => {
        const combined = [
            ...approvedTypes.map((dt: any) => ({ ...dt, _status: 'approved' as const })),
            ...pendingTypes.map((dt: any) => ({ ...dt, _status: 'pending' as const })),
            ...deniedTypes.map((dt: any) => ({ ...dt, _status: 'denied' as const })),
        ];
        
        if (statusFilter === 'all') return combined;
        return combined.filter(dt => dt._status === statusFilter);
    }, [approvedTypes, pendingTypes, deniedTypes, statusFilter]);

    // Counts for badges
    const counts = useMemo(() => ({
        all: approvedTypes.length + pendingTypes.length + deniedTypes.length,
        approved: approvedTypes.length,
        pending: pendingTypes.length,
        denied: deniedTypes.length,
    }), [approvedTypes, pendingTypes, deniedTypes]);

    // Refetch all queries
    const refetchAll = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: ['deviceTypes'] });
        queryClient.invalidateQueries({ queryKey: ['pendingDeviceTypes'] });
        queryClient.invalidateQueries({ queryKey: ['deniedDeviceTypes'] });
    }, [queryClient]);

    // Auto-select first item when filter changes or data loads
    useEffect(() => {
        if (allTypes.length > 0) {
            // Only auto-select if no item is selected or selected item is no longer in the list
            const currentStillExists = selectedType && allTypes.some(
                t => t.id === selectedType.id && t._status === selectedType._status
            );
            if (!currentStillExists) {
                const firstItem = allTypes[0];
                setSelectedType(firstItem);
                setEditName(firstItem.name || "");
                setIsEditingName(false);
                if (firstItem.definition?.structure) {
                    const { nodes: flatNodes, edges: flatEdges } = reconstructGraph(firstItem.definition.structure);
                    setNodes(flatNodes);
                    setEdges(flatEdges);
                } else {
                    setNodes([]);
                    setEdges([]);
                }
            }
        } else {
            setSelectedType(null);
            setNodes([]);
            setEdges([]);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [allTypes.length, statusFilter]);

    // --- Mutations ---
    
    // Approve mutation with optional name change
    const approveMutation = useMutation({
        mutationFn: async ({ id, newName }: { id: number; newName?: string }) => {
            // If name changed, update it first
            if (newName && newName !== selectedType?.name) {
                await updateAdminDeviceType(id, { name: newName }, true);
            }
            return approveDeviceType(id);
        },
        onSuccess: () => {
            toast.success("Device Type Approved", { 
                description: `${editName || selectedType?.name} is now available for use.` 
            });
            setIsEditingName(false);
            setEditName("");
            queryClient.invalidateQueries({ queryKey: ['pendingDeviceTypes'] });
            queryClient.invalidateQueries({ queryKey: ['deviceTypes'] });
            queryClient.invalidateQueries({ queryKey: ['pendingCount'] });
        },
        onError: (e: any) => {
            toast.error("Approval Failed", { description: e.message });
        },
    });

    // Deny mutation
    const denyMutation = useMutation({
        mutationFn: ({ id, reason }: { id: number; reason: string }) => 
            denyDeviceType(id, reason),
        onSuccess: () => {
            toast.success("Device Type Denied", {
                description: "The device type has been rejected."
            });
            setIsDenyOpen(false);
            setDenyReason("");
            queryClient.invalidateQueries({ queryKey: ['pendingDeviceTypes'] });
            queryClient.invalidateQueries({ queryKey: ['deniedDeviceTypes'] });
            queryClient.invalidateQueries({ queryKey: ['pendingCount'] });
        },
        onError: (e: any) => {
            toast.error("Denial Failed", { description: e.message });
        },
    });

    // Delete approved type mutation
    const deleteMutation = useMutation({
        mutationFn: (id: number) => deleteDeviceType(id),
        onSuccess: () => {
            toast.success("Device Type Deleted");
            setIsDeleteOpen(false);
            setSelectedType(null);
            queryClient.invalidateQueries({ queryKey: ['deviceTypes'] });
        },
        onError: (e: any) => {
            toast.error("Delete Failed", { description: e.message });
        },
    });

    // Delete denied type mutation
    const deleteDeniedMutation = useMutation({
        mutationFn: (id: number) => deleteDeniedDeviceType(id),
        onSuccess: () => {
            toast.success("Denied Type Deleted");
            setIsDeleteOpen(false);
            setSelectedType(null);
            queryClient.invalidateQueries({ queryKey: ['deniedDeviceTypes'] });
        },
        onError: (e: any) => {
            toast.error("Delete Failed", { description: e.message });
        },
    });

    // Bulk delete denied mutation
    const bulkDeleteMutation = useMutation({
        mutationFn: (ids: number[] | null) => {
            // @ts-ignore
            return bulkDeleteDeniedDeviceTypes(ids);
        },
        onSuccess: (data: any) => {
            toast.success("Denied Types Deleted", { 
                description: data.message || `Deleted ${data.deleted_count} type(s)` 
            });
            setIsBulkDeleteOpen(false);
            setSelectedIds(new Set());
            setSelectedType(null);
            queryClient.invalidateQueries({ queryKey: ['deniedDeviceTypes'] });
        },
        onError: (e: any) => {
            toast.error("Bulk Delete Failed", { description: e.message });
        },
    });

    // --- Handlers ---
    
    const handleSelect = useCallback((item: any) => {
        setSelectedType(item);
        setEditName(item.name || "");
        setIsEditingName(false);
        if (item.definition?.structure) {
            const { nodes: flatNodes, edges: flatEdges } = reconstructGraph(item.definition.structure);
            setNodes(flatNodes);
            setEdges(flatEdges);
        } else {
            setNodes([]);
            setEdges([]);
        }
    }, [setNodes, setEdges]);

    const handleToggleSelect = useCallback((id: number, checked: boolean) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (checked) {
                newSet.add(id);
            } else {
                newSet.delete(id);
            }
            return newSet;
        });
    }, []);

    const handleSelectAllDenied = useCallback(() => {
        const deniedIds = deniedTypes.map((t: any) => t.id);
        if (selectedIds.size === deniedIds.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(deniedIds));
        }
    }, [deniedTypes, selectedIds.size]);

    const handleApprove = useCallback(() => {
        if (!selectedType) return;
        approveMutation.mutate({ 
            id: selectedType.id, 
            newName: isEditingName ? editName : undefined 
        });
    }, [selectedType, approveMutation, isEditingName, editName]);

    const handleDeny = useCallback(() => {
        if (!selectedType || !denyReason) return;
        denyMutation.mutate({ id: selectedType.id, reason: denyReason });
    }, [selectedType, denyReason, denyMutation]);

    const handleDelete = useCallback(() => {
        if (!selectedType) return;
        if (selectedType._status === 'denied') {
            deleteDeniedMutation.mutate(selectedType.id);
        } else {
            deleteMutation.mutate(selectedType.id);
        }
    }, [selectedType, deleteMutation, deleteDeniedMutation]);

    const handleBulkDelete = useCallback(() => {
        if (selectedIds.size === 0) return;
        bulkDeleteMutation.mutate(Array.from(selectedIds));
    }, [selectedIds, bulkDeleteMutation]);

    // Mock Device for Preview
    const previewDevice = selectedType ? {
        id: "preview-123",
        name: isEditingName ? editName : (selectedType.name || "Preview Device"),
        ip_address: "192.168.1.xxx",
        status: "online",
        icon: "fa-cube",
        current_state: {}
    } : null;

    const selectedDeniedCount = Array.from(selectedIds).filter(id => 
        deniedTypes.some((t: any) => t.id === id)
    ).length;

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] gap-4 p-4 md:p-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Device Types</h1>
                    <p className="text-sm text-muted-foreground">Manage and review all device type definitions</p>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Button variant="outline" size="sm" onClick={refetchAll} disabled={isLoading}>
                        <RotateCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Link href="/dashboard/device-builder">
                        <Button size="sm">
                            <Plus className="w-4 h-4 mr-2" />
                            New Definition
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-muted-foreground" />
                    <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                        <SelectTrigger className="w-[180px] h-9">
                            <SelectValue placeholder="Filter by status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">
                                <div className="flex items-center gap-2">
                                    All Types
                                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{counts.all}</Badge>
                                </div>
                            </SelectItem>
                            <SelectItem value="approved">
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-green-500" />
                                    Approved
                                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{counts.approved}</Badge>
                                </div>
                            </SelectItem>
                            <SelectItem value="pending">
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                                    Pending
                                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{counts.pending}</Badge>
                                </div>
                            </SelectItem>
                            <SelectItem value="denied">
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-red-500" />
                                    Denied
                                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{counts.denied}</Badge>
                                </div>
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Bulk actions for denied types */}
                {statusFilter === 'denied' && deniedTypes.length > 0 && (
                    <div className="flex items-center gap-2">
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 px-2 text-xs"
                            onClick={handleSelectAllDenied}
                        >
                            {selectedIds.size === deniedTypes.length ? (
                                <><CheckSquare className="w-3 h-3 mr-1" /> Deselect All</>
                            ) : (
                                <><Square className="w-3 h-3 mr-1" /> Select All</>
                            )}
                        </Button>
                        {selectedDeniedCount > 0 && (
                            <Button 
                                variant="destructive" 
                                size="sm"
                                className="h-8"
                                onClick={() => setIsBulkDeleteOpen(true)}
                            >
                                <Trash2 className="w-3 h-3 mr-1" />
                                Delete Selected ({selectedDeniedCount})
                            </Button>
                        )}
                    </div>
                )}
            </div>

            {/* Main Content */}
            {isLoading ? (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                    <RotateCw className="w-5 h-5 animate-spin mr-2" />
                    Loading device types...
                </div>
            ) : allTypes.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground rounded-xl border border-dashed bg-muted/5">
                    <div className="p-4 rounded-full bg-muted/20 mb-4">
                        <Inbox className="w-10 h-10 opacity-50" />
                    </div>
                    <p className="text-lg font-medium">No device types found</p>
                    <p className="text-sm opacity-75">
                        {statusFilter === 'all' 
                            ? "Create your first device type to get started"
                            : `No ${statusFilter} device types`}
                    </p>
                    {statusFilter === 'all' && (
                        <Link href="/dashboard/device-builder" className="mt-4">
                            <Button size="sm">
                                <Plus className="w-4 h-4 mr-2" />
                                Create Device Type
                            </Button>
                        </Link>
                    )}
                </div>
            ) : (
                <div className="flex-1 flex flex-col lg:flex-row gap-4 overflow-hidden min-h-0">
                    {/* Left Panel: Type List */}
                    {isMobile ? (
                        /* Mobile: Dropdown Selector */
                        <div className="shrink-0">
                            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                                {allTypes.length} {statusFilter === 'all' ? 'total' : statusFilter}
                            </div>
                            <Select 
                                value={selectedType ? `${selectedType._status}-${selectedType.id}` : undefined}
                                onValueChange={(value) => {
                                    const [status, id] = value.split('-');
                                    const found = allTypes.find((t: any) => t.id === parseInt(id) && t._status === status);
                                    if (found) handleSelect(found);
                                }}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select a device type">
                                        {selectedType && (
                                            <div className="flex items-center gap-2">
                                                <StatusBadge status={selectedType._status} />
                                                <span className="truncate">{selectedType.name}</span>
                                            </div>
                                        )}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    {allTypes.map((t: any) => (
                                        <SelectItem key={`${t._status}-${t.id}`} value={`${t._status}-${t.id}`}>
                                            <div className="flex items-center gap-2">
                                                <StatusBadge status={t._status} />
                                                <span className="truncate">{t.name}</span>
                                                <span className="text-xs text-muted-foreground ml-auto">
                                                    {t.definition?.structure?.length || 0} comp.
                                                </span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {/* Bulk actions for denied on mobile */}
                            {statusFilter === 'denied' && deniedTypes.length > 0 && (
                                <div className="flex items-center gap-2 mt-2">
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-8 px-2 text-xs"
                                        onClick={handleSelectAllDenied}
                                    >
                                        {selectedIds.size === deniedTypes.length ? (
                                            <><CheckSquare className="w-3 h-3 mr-1" /> Deselect All</>
                                        ) : (
                                            <><Square className="w-3 h-3 mr-1" /> Select All</>
                                        )}
                                    </Button>
                                    {selectedDeniedCount > 0 && (
                                        <Button 
                                            variant="destructive" 
                                            size="sm"
                                            className="h-8"
                                            onClick={() => setIsBulkDeleteOpen(true)}
                                        >
                                            <Trash2 className="w-3 h-3 mr-1" />
                                            Delete ({selectedDeniedCount})
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        /* Desktop: Scrollable List */
                        <div className="w-full lg:w-72 flex flex-col gap-2 shrink-0 lg:pr-2 overflow-hidden">
                            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1 shrink-0">
                                {allTypes.length} {statusFilter === 'all' ? 'total' : statusFilter}
                            </div>
                            <ScrollArea className="flex-1 h-full">
                                <div className="flex flex-col gap-2 pb-2 pr-3">
                                    {allTypes.map((t: any) => (
                                        <div 
                                            key={`${t._status}-${t.id}`}
                                            className={`transition-all p-3 rounded-lg border ${
                                                selectedType?.id === t.id && selectedType?._status === t._status
                                                    ? 'border-primary bg-primary/5 shadow-sm' 
                                                    : 'border-border bg-card hover:bg-muted/50'
                                            }`}
                                        >
                                            <div className="flex items-start gap-2">
                                                {t._status === 'denied' && statusFilter === 'denied' && (
                                                    <Checkbox 
                                                        checked={selectedIds.has(t.id)}
                                                        onCheckedChange={(checked) => handleToggleSelect(t.id, !!checked)}
                                                        className="mt-0.5"
                                                    />
                                                )}
                                                <div 
                                                    className="flex-1 cursor-pointer"
                                                    onClick={() => handleSelect(t)}
                                                >
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="font-medium text-sm truncate">{t.name}</span>
                                                        <StatusBadge status={t._status} />
                                                    </div>
                                                    <div className="text-xs text-muted-foreground mt-1.5">
                                                        {t.definition?.structure?.length || 0} component{(t.definition?.structure?.length || 0) !== 1 ? 's' : ''} · {new Date(t.created_at || Date.now()).toLocaleDateString()}
                                                    </div>
                                                    {t._status === 'denied' && t.rejection_reason && (
                                                        <div className="mt-2 text-xs text-red-600 dark:text-red-400 bg-red-500/10 rounded px-2 py-1 line-clamp-2">
                                                            <XCircle className="w-3 h-3 inline mr-1" />
                                                            {t.rejection_reason}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>
                    )}

                    {/* Right Panel: Detail View */}
                    {selectedType ? (
                        <div className="flex-1 flex flex-col gap-4 overflow-hidden min-h-0 lg:border-l lg:pl-4">
                            {/* Header with Actions */}
                            <div className="flex flex-col gap-3 shrink-0">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                    <div className="flex-1">
                                        {selectedType._status === 'pending' ? (
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <Label htmlFor="deviceName" className="text-xs text-muted-foreground">Device Name</Label>
                                                    {!isEditingName && (
                                                        <Button 
                                                            variant="ghost" 
                                                            size="sm" 
                                                            className="h-6 px-2 text-xs"
                                                            onClick={() => setIsEditingName(true)}
                                                        >
                                                            <Edit className="w-3 h-3 mr-1" /> Edit
                                                        </Button>
                                                    )}
                                                </div>
                                                {isEditingName ? (
                                                    <div className="flex items-center gap-2">
                                                        <Input
                                                            id="deviceName"
                                                            value={editName}
                                                            onChange={(e) => setEditName(e.target.value)}
                                                            className="h-9 max-w-xs"
                                                            placeholder="Enter device name"
                                                        />
                                                        <Button 
                                                            variant="ghost" 
                                                            size="sm"
                                                            onClick={() => {
                                                                setIsEditingName(false);
                                                                setEditName(selectedType.name);
                                                            }}
                                                        >
                                                            Cancel
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <h2 className="text-lg font-bold">{selectedType.name}</h2>
                                                )}
                                            </div>
                                        ) : (
                                            <div>
                                                <h2 className="text-lg font-bold">{selectedType.name}</h2>
                                                {selectedType._status === 'denied' && (
                                                    <p className="text-xs text-muted-foreground">
                                                        Denied on {new Date(selectedType.created_at).toLocaleDateString()}
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* Action Buttons based on status */}
                                    <div className="flex gap-2 w-full sm:w-auto">
                                        {selectedType._status === 'pending' && (
                                            <>
                                                <Button 
                                                    variant="outline" 
                                                    size="sm" 
                                                    className="flex-1 sm:flex-none border-red-500/30 text-red-600 hover:bg-red-500/10 hover:text-red-600" 
                                                    onClick={() => setIsDenyOpen(true)}
                                                >
                                                    <XCircle className="w-4 h-4 mr-1.5" /> Deny
                                                </Button>
                                                <Button 
                                                    size="sm" 
                                                    className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700" 
                                                    onClick={handleApprove}
                                                    disabled={approveMutation.isPending}
                                                >
                                                    <CheckCircle2 className="w-4 h-4 mr-1.5" /> 
                                                    {approveMutation.isPending ? 'Approving...' : 'Approve'}
                                                </Button>
                                            </>
                                        )}
                                        {selectedType._status === 'approved' && (
                                            <>
                                                <Link href={`/dashboard/device-builder?edit=${selectedType.id}`}>
                                                    <Button variant="outline" size="sm">
                                                        <Edit className="w-4 h-4 mr-1.5" /> Edit Structure
                                                    </Button>
                                                </Link>
                                                <Button 
                                                    variant="outline" 
                                                    size="sm"
                                                    className="border-red-500/30 text-red-600 hover:bg-red-500/10"
                                                    onClick={() => setIsDeleteOpen(true)}
                                                >
                                                    <Trash2 className="w-4 h-4 mr-1.5" /> Delete
                                                </Button>
                                            </>
                                        )}
                                        {selectedType._status === 'denied' && (
                                            <Button 
                                                variant="destructive" 
                                                size="sm"
                                                onClick={() => setIsDeleteOpen(true)}
                                            >
                                                <Trash2 className="w-4 h-4 mr-1.5" /> Delete
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                {/* Rejection Reason for denied types */}
                                {selectedType._status === 'denied' && selectedType.rejection_reason && (
                                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                                        <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-medium text-sm mb-1">
                                            <AlertTriangle className="w-4 h-4" />
                                            Rejection Reason
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            {selectedType.rejection_reason}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Preview Panels */}
                            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0 overflow-auto">
                                {/* Panel 1: Hardware Topology */}
                                <div className="flex flex-col rounded-lg border bg-card overflow-hidden min-h-[300px]">
                                    <div className="py-2 px-3 border-b bg-muted/30 shrink-0">
                                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Hardware Topology</span>
                                    </div>
                                    <div className="flex-1 relative">
                                        <ReactFlowProvider key={`${selectedType._status}-${selectedType.id}`}>
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
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-muted-foreground lg:border-l">
                            <p className="text-sm">Select a device type to view details</p>
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
                            Please provide a reason for rejecting &quot;{selectedType?.name}&quot;. This will be stored with the denied type.
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
                        <Button 
                            variant="destructive" 
                            onClick={handleDeny} 
                            disabled={!denyReason.trim() || denyMutation.isPending}
                        >
                            {denyMutation.isPending ? 'Denying...' : 'Confirm Denial'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Modal */}
            <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Device Type</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to permanently delete &quot;{selectedType?.name}&quot;? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
                        <Button 
                            variant="destructive" 
                            onClick={handleDelete}
                            disabled={deleteMutation.isPending || deleteDeniedMutation.isPending}
                        >
                            {(deleteMutation.isPending || deleteDeniedMutation.isPending) ? 'Deleting...' : 'Delete'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Bulk Delete Modal */}
            <Dialog open={isBulkDeleteOpen} onOpenChange={setIsBulkDeleteOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Selected Types</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete {selectedDeniedCount} denied device type(s)? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsBulkDeleteOpen(false)}>Cancel</Button>
                        <Button 
                            variant="destructive" 
                            onClick={handleBulkDelete}
                            disabled={bulkDeleteMutation.isPending}
                        >
                            {bulkDeleteMutation.isPending ? 'Deleting...' : `Delete ${selectedDeniedCount} Type(s)`}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
