"use client"

import { useMemo, useCallback } from "react"
import { useQuery } from "@tanstack/react-query";
import { 
  Plus,
  LayoutGrid,
  List,
  Filter,
  Activity,
  SortAsc,
  Pencil,
  Home
} from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
    Select,
    SelectContent,
    SelectItem,
    SelectSeparator,
    SelectTrigger,
    SelectValue, 
} from "@/components/ui/select"
import { fetchDevices, fetchDeviceTypes, fetchRooms, saveSharedDashboardLayout } from "@/lib/apiClient"
import { Skeleton } from "@/components/ui/skeleton"
import { AddDeviceDialog } from '@/components/devices/AddDeviceDialog';
import { getIconComponent } from "@/lib/icons";
import SmartDeviceCard from "@/components/devices/SmartDeviceCard";
import { DeviceCardSkeletonGrid } from "@/components/devices/DeviceCardSkeleton";
import DraggableDeviceGrid from "@/components/devices/DraggableDeviceGrid";
import { useDashboardLayout, type DeviceOrder } from "@/hooks/useDashboardLayout";
import { useUser } from "@/components/user-provider";
import { toast } from "sonner";
import { OnboardingChecklist } from "@/components/onboarding/OnboardingChecklist";
import { PageTooltip } from "@/components/onboarding/PageTooltip";

// Helper to get ID securely
const getId = (obj: any) => (typeof obj === 'object' && obj !== null ? obj.id : obj);

// Module-level cache to prevent "no devices" flash on remount
let cachedDevicesExist = false;
let cachedDeviceCount = 0;

export default function DashboardPage() {
  const { user } = useUser();
  const role = user?.profile?.role || user?.role;
  const isAdmin = role === 'admin' || role === 'owner';

  const { data: devicesData, isLoading: loadingDevices, isSuccess: devicesSuccess } = useQuery({
    queryKey: ['devices'],
    queryFn: async () => {
        const res = await fetchDevices();
        const raw = Array.isArray(res) ? res : (res.results || []);
        // Sort by ID to prevent UI jumping when polling
        return raw.sort((a: any, b: any) => {
            const idA = typeof a.id === 'number' ? a.id : parseInt(a.id || '0');
            const idB = typeof b.id === 'number' ? b.id : parseInt(b.id || '0');
            return idA - idB;
        });
    },
    refetchInterval: 3000, // Poll every 3 seconds for mock hardware feedback
    staleTime: 2000, // Keep data fresh for 2 seconds to prevent flicker
  });

  // Ensure devices is always an array - use undefined to detect "never loaded"
  const devices = Array.isArray(devicesData) ? devicesData : [];
  const hasLoadedDevices = devicesData !== undefined;

  const { data: deviceTypesData, isLoading: loadingTypes, isSuccess: typesSuccess } = useQuery({
      queryKey: ['deviceTypes'],
      queryFn: async () => {
          const res = await fetchDeviceTypes();
          return Array.isArray(res) ? res : (res.results || []);
      },
      staleTime: 60000 // Types change rarely
  });
  const deviceTypes = Array.isArray(deviceTypesData) ? deviceTypesData : [];

  const { data: roomsData, isLoading: loadingRooms, isSuccess: roomsSuccess } = useQuery({
      queryKey: ['rooms'],
      queryFn: async () => {
          const res = await fetchRooms();
          return Array.isArray(res) ? res : (res.results || []);
      },
      staleTime: 60000
  });
  const rooms = Array.isArray(roomsData) ? roomsData : [];

  // Show loading until we've successfully loaded devices at least once
  // Track if we've ever had devices to prevent flash of "no devices"
  if (devices.length > 0) {
    cachedDevicesExist = true;
    cachedDeviceCount = devices.length;
  }
  const isInitialLoading = !hasLoadedDevices || (loadingDevices && !cachedDevicesExist);
  
  // Only show "no devices" if we've never had devices OR if we truly have 0 after a successful fetch
  // If we've had devices before, keep showing skeleton during refetch that returns empty
  const showNoDevices = !isInitialLoading && devices.length === 0 && !cachedDevicesExist;

  // ── Dashboard grid layout (folders + drag-to-reorder) ────
  const deviceIds = useMemo(() => devices.map((d: any) => d.id), [devices]);
  const {
    layout,
    editMode,
    setEditMode,
    moveItem,
    createFolder,
    addToFolder,
    removeFromFolder,
    renameFolder,
    dissolveFolder,
    resetLayout,
    revertToShared,
    isSaving,
    deviceOrder,
    setDeviceOrder,
  } = useDashboardLayout(deviceIds);

  // Map deviceOrder to viewMode for the grouping selector
  // 'custom' maps to the drag-and-drop grid view ("all")
  const viewMode = deviceOrder === 'custom' ? 'all' : deviceOrder;
  const setViewMode = useCallback((mode: string) => {
    if (mode === 'all-edit') {
      // Enter All Devices view + edit mode simultaneously
      setDeviceOrder('custom');
      setEditMode(true);
      return;
    }
    // Exit edit mode when switching away from All Devices
    if (editMode) setEditMode(false);
    // Map UI selection back to DeviceOrder
    const order: DeviceOrder = mode === 'all' ? 'custom' : mode as DeviceOrder;
    setDeviceOrder(order);
  }, [setDeviceOrder, setEditMode, editMode]);

  // Admin: push current layout as shared default for all users
  const handleSetAsShared = useCallback(async () => {
    if (!layout) return;
    try {
      await saveSharedDashboardLayout(layout);
      toast.success("Layout set as default for all users");
    } catch (err: any) {
      toast.error("Failed to set shared layout", {
        description: err?.message || "Please try again.",
      });
    }
  }, [layout]);

  // Helpers for lookups
  const getRoomName = (id: any) => {
      const room = rooms.find((r: any) => r.id === id);
      return room ? room.name : "Unassigned";
  };

  const getRoomIcon = (id: any) => {
      const room = rooms.find((r: any) => r.id === id);
      return room?.icon || '';
  };
  
  const getTypeName = (id: any) => {
      const type = deviceTypes.find((t: any) => t.id === id);
      return type ? type.name : "Unknown Type";
  };

  const getDeviceTypeObj = (id: any) => {
      return deviceTypes.find((t: any) => t.id === id); // Updated type annotation
  };

  // Grouping Logic
  const groupedContent = useMemo(() => {
    if (devices.length === 0) return null;

    if (viewMode === 'room') {
        // Group by Room
        const groups: Record<string, any[]> = {};
        
        devices.forEach((d: any) => { // Updated type annotation
            const rId = getId(d.room);
            const rName = rId ? getRoomName(rId) : "Unassigned";
            if (!groups[rName]) groups[rName] = [];
            groups[rName].push(d);
        });

        // Ensure all rooms exist even if empty (optional, but good for completeness)
        rooms.forEach((r: any) => { // Updated type annotation
             if (!groups[r.name]) groups[r.name] = [];
        });

        return Object.entries(groups).sort((a,b) => a[0].localeCompare(b[0])).map(([groupName, groupDevices]) => {
            const roomObj = rooms.find((r: any) => r.name === groupName);
            const RoomIcon = (roomObj?.icon ? getIconComponent(roomObj.icon) : null) || Home;
            return (
            <div key={groupName} className="space-y-4">
                 <div className="flex items-center gap-2 pb-2 border-b">
                    <RoomIcon className="h-5 w-5 text-muted-foreground" />
                    <h3 className="text-lg font-semibold tracking-tight">{groupName}</h3>
                    <Badge variant="secondary" className="ml-auto">{groupDevices.length}</Badge>
                 </div>
                 {groupDevices.length === 0 ? (
                     <div className="text-sm text-muted-foreground italic py-4">No devices in this room</div>
                 ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                         {groupDevices.map((d, i) => (
                             <SmartDeviceCard 
                                key={d.id} 
                                device={d} 
                                deviceType={getDeviceTypeObj(getId(d.device_type))}
                                roomName={""}
                                roomIcon={""}
                                animationIndex={i}
                             />
                         ))}
                    </div>
                 )}
            </div>
            );
        });
    }

    if (viewMode === 'type') {
        const groups: Record<string, any[]> = {};
        
        devices.forEach((d: any) => {
            const tId = getId(d.device_type);
            const tName = tId ? getTypeName(tId) : "Unknown Type";
            if (!groups[tName]) groups[tName] = [];
            groups[tName].push(d);
        });

        return Object.entries(groups).sort((a,b) => a[0].localeCompare(b[0])).map(([groupName, groupDevices]) => (
            <div key={groupName} className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <h3 className="text-lg font-semibold tracking-tight">{groupName}</h3>
                    <Badge variant="secondary" className="ml-auto">{groupDevices.length}</Badge>
                 </div>
                 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {groupDevices.map((d, i) => (
                            <SmartDeviceCard 
                                key={d.id} 
                                device={d} 
                                deviceType={getDeviceTypeObj(getId(d.device_type))}
                                roomName={getRoomName(getId(d.room))}
                                roomIcon={getRoomIcon(getId(d.room))}
                                animationIndex={i}
                            />
                        ))}
                </div>
            </div>
        ));
    }

    if (viewMode === 'status') {
        const groups: Record<string, any[]> = { 'Online': [], 'Offline': [], 'Error': [] };
        
        devices.forEach((d: any) => {
            const status = d.status || (d.is_online ? 'online' : 'offline');
            if (status === 'online') groups['Online'].push(d);
            else if (status === 'error') groups['Error'].push(d);
            else groups['Offline'].push(d);
        });

        return Object.entries(groups).filter(([, g]) => g.length > 0).map(([groupName, groupDevices]) => (
            <div key={groupName} className="space-y-4">
                 <div className="flex items-center gap-2 pb-2 border-b">
                    <h3 className="text-lg font-semibold tracking-tight">{groupName}</h3>
                    <Badge variant="secondary" className="ml-auto">{groupDevices.length}</Badge>
                 </div>
                 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {groupDevices.map((d, i) => (
                            <SmartDeviceCard 
                                key={d.id} 
                                device={d} 
                                deviceType={getDeviceTypeObj(getId(d.device_type))}
                                roomName={getRoomName(getId(d.room))}
                                roomIcon={getRoomIcon(getId(d.room))}
                                animationIndex={i}
                            />
                        ))}
                </div>
            </div>
        ));
    }

    if (viewMode === 'name') {
        const sorted = [...devices].sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));

        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {sorted.map((d: any, i: number) => (
                    <SmartDeviceCard 
                        key={d.id} 
                        device={d}
                        deviceType={getDeviceTypeObj(getId(d.device_type))}
                        roomName={getRoomName(getId(d.room))}
                        roomIcon={getRoomIcon(getId(d.room))}
                        animationIndex={i}
                    />
                ))}
            </div>
        );
    }

    // Default: 'all'
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {devices.map((d: any, i: number) => (
                <SmartDeviceCard 
                    key={d.id} 
                    device={d}
                    deviceType={getDeviceTypeObj(getId(d.device_type))}
                    roomName={getRoomName(getId(d.room))}
                    roomIcon={getRoomIcon(getId(d.room))}
                    animationIndex={i}
                />
            ))}
        </div>
    );

  }, [devices, rooms, deviceTypes, viewMode]);


  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 pt-6 pb-10 min-h-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Manage your connected devices
          </p>
        </div>
        <div className="flex items-center gap-2">
            <Select value={viewMode} onValueChange={setViewMode}>
                <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue placeholder="Group by..." />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">
                        <div className="flex items-center gap-2">
                            <LayoutGrid className="w-4 h-4" /> All Devices
                        </div>
                    </SelectItem>
                    <SelectItem value="room">
                         <div className="flex items-center gap-2">
                            <List className="w-4 h-4" /> Group by Room
                        </div>
                    </SelectItem>
                    <SelectItem value="type">
                         <div className="flex items-center gap-2">
                            <Filter className="w-4 h-4" /> Group by Type
                        </div>
                    </SelectItem>
                    <SelectItem value="status">
                         <div className="flex items-center gap-2">
                            <Activity className="w-4 h-4" /> Group by Status
                        </div>
                    </SelectItem>
                    <SelectItem value="name">
                         <div className="flex items-center gap-2">
                            <SortAsc className="w-4 h-4" /> Sort by Name
                        </div>
                    </SelectItem>
                    <SelectSeparator />
                    <SelectItem value="all-edit">
                         <div className="flex items-center gap-2">
                            <Pencil className="w-4 h-4" /> Edit Layout
                        </div>
                    </SelectItem>
                </SelectContent>
            </Select>

            <AddDeviceDialog 
                onDeviceAdded={() => window.location.reload()} 
                trigger={
                    <Button>
                        <Plus className="mr-2 h-4 w-4" /> Add
                    </Button>
                }
            />
        </div>
      </div>

      {/* Onboarding */}
      <PageTooltip pageKey="dashboard" message="This is your control center. Add devices, organize them into rooms, and monitor everything in real time." />
      <OnboardingChecklist
        isAdmin={isAdmin}
        deviceCount={devices.length}
        roomCount={rooms.length}
        deviceTypeCount={deviceTypes.length}
      />

      {/* Content */}
      <div className="flex-1">
         {(isInitialLoading || (devices.length === 0 && cachedDevicesExist)) ? (
             <DeviceCardSkeletonGrid count={cachedDeviceCount || undefined} />
         ) : showNoDevices ? (
             <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg text-muted-foreground bg-muted/30">
                 <p className="mb-4 text-lg">No devices found</p>
                 <AddDeviceDialog 
                    onDeviceAdded={() => window.location.reload()} 
                 />
             </div>
         ) : viewMode === 'all' && layout ? (
             <DraggableDeviceGrid
               layout={layout}
               devices={devices}
               deviceTypes={deviceTypes}
               rooms={rooms}
               editMode={editMode}
               onToggleEditMode={() => setEditMode(!editMode)}
               onMoveItem={moveItem}
               onCreateFolder={createFolder}
               onAddToFolder={addToFolder}
               onRemoveFromFolder={removeFromFolder}
               onRenameFolder={renameFolder}
               onDissolveFolder={dissolveFolder}
               onResetLayout={resetLayout}
               onRevertToShared={revertToShared}
               isAdmin={isAdmin}
               isSaving={isSaving}
               onSetAsShared={handleSetAsShared}
             />
         ) : (
             <div className="flex flex-col gap-8">
                {groupedContent}
             </div>
         )}
      </div>
    </div>
  )
}
