"use client"

import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query";
import { 
  Plus,
  LayoutGrid,
  List,
  Filter
} from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue, 
} from "@/components/ui/select"
import { fetchDevices, fetchDeviceTypes, fetchRooms } from "@/lib/apiClient"
import { Skeleton } from "@/components/ui/skeleton"
import { AddDeviceDialog } from '@/components/devices/AddDeviceDialog';
import { getIconComponent } from "@/lib/icons";
import SmartDeviceCard from "@/components/devices/SmartDeviceCard";

// Helper to get ID securely
const getId = (obj: any) => (typeof obj === 'object' && obj !== null ? obj.id : obj);

// Module-level cache to prevent "no devices" flash on remount
let cachedDevicesExist = false;

export default function DashboardPage() {
  const [viewMode, setViewMode] = useState<string>("all");

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
  }
  const isInitialLoading = !hasLoadedDevices || (loadingDevices && !cachedDevicesExist);
  
  // Only show "no devices" if we've never had devices OR if we truly have 0 after a successful fetch
  // If we've had devices before, keep showing skeleton during refetch that returns empty
  const showNoDevices = !isInitialLoading && devices.length === 0 && !cachedDevicesExist;

  // Helpers for lookups
  const getRoomName = (id: any) => {
      const room = rooms.find((r: any) => r.id === id);
      return room ? room.name : "Unassigned";
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

        return Object.entries(groups).sort((a,b) => a[0].localeCompare(b[0])).map(([groupName, groupDevices]) => (
            <div key={groupName} className="space-y-4">
                 <div className="flex items-center gap-2 pb-2 border-b">
                    <h3 className="text-lg font-semibold tracking-tight">{groupName}</h3>
                    <Badge variant="secondary" className="ml-auto">{groupDevices.length}</Badge>
                 </div>
                 {groupDevices.length === 0 ? (
                     <div className="text-sm text-muted-foreground italic py-4">No devices in this room</div>
                 ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                         {groupDevices.map(d => (
                             <SmartDeviceCard 
                                key={d.id} 
                                device={d} 
                                deviceType={getDeviceTypeObj(getId(d.device_type))}
                                roomName={""} 
                             />
                         ))}
                    </div>
                 )}
            </div>
        ));
    }

    if (viewMode === 'type') {
        const groups: Record<string, any[]> = {};
        
        devices.forEach((d: any) => { // Updated type annotation
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
                        {groupDevices.map(d => (
                            <SmartDeviceCard 
                                key={d.id} 
                                device={d} 
                                deviceType={getDeviceTypeObj(getId(d.device_type))}
                                roomName={getRoomName(getId(d.room))}
                            />
                        ))}
                </div>
            </div>
        ));
    }

    // Default: 'all'
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {devices.map((d: any) => ( // Updated type annotation
                <SmartDeviceCard 
                    key={d.id} 
                    device={d}
                    deviceType={getDeviceTypeObj(getId(d.device_type))}
                    roomName={getRoomName(getId(d.room))}
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

      {/* Content */}
      <div className="flex-1">
         {(isInitialLoading || (devices.length === 0 && cachedDevicesExist)) ? (
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1,2,3,4].map(i => (
                    <Card key={i}><CardContent className="h-40 flex items-center justify-center"><Skeleton className="h-20 w-20 rounded-full" /></CardContent></Card>
                ))}
             </div>
         ) : showNoDevices ? (
             <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg text-muted-foreground bg-muted/30">
                 <p className="mb-4 text-lg">No devices found</p>
                 <AddDeviceDialog 
                    onDeviceAdded={() => window.location.reload()} 
                 />
             </div>
         ) : (
             <div className="flex flex-col gap-8">
                {groupedContent}
             </div>
         )}
      </div>
    </div>
  )
}
