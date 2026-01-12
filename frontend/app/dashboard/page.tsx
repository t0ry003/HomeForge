"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { 
  Plus,
  Cpu,
  LayoutGrid,
  List,
  Filter
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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

// Helper to get ID securely
const getId = (obj: any) => (typeof obj === 'object' && obj !== null ? obj.id : obj);

// Device Card Component
function DeviceCard({ device, roomName, typeName }: { device: any, roomName?: string, typeName?: string }) {
    const Icon = (device.icon ? getIconComponent(device.icon) : null) || Cpu;
    const status = device.status || 'offline'; // Default if missing
    const isOnline = status === 'online';
    
    return (
        <Card className={`group transition-all duration-300 hover:shadow-md cursor-pointer
            ${isOnline 
                ? 'border-green-500/30 shadow-[0_0_15px_-5px_rgba(34,197,94,0.1)] bg-green-500/5 hover:border-green-500/50' 
                : 'hover:border-primary/50'
            }
        `}>
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div className="flex flex-col gap-1 w-full overflow-hidden">
                     <CardTitle className="text-base font-semibold truncate" title={device.name}>
                        {device.name}
                    </CardTitle>
                    {roomName && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                            {roomName}
                        </p>
                    )}
                </div>
                <div className="relative flex items-center justify-center h-2.5 w-2.5">
                    {isOnline && (
                         <div className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-75 duration-1000" />
                    )}
                    <div className={`shrink-0 h-2.5 w-2.5 rounded-full ring-2 ring-background z-10
                        ${isOnline ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 
                          status === 'error' ? 'bg-red-500' : 
                          'bg-zinc-300 dark:bg-zinc-600'}`} 
                          title={status}
                    />
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col items-center justify-center py-2 relative">
                    <div className="relative mb-2">
                        <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className={`relative p-4 rounded-xl transition-colors text-foreground
                            ${isOnline 
                                ? 'bg-green-500/10 text-green-700 dark:text-green-400 group-hover:text-green-600' 
                                : 'bg-secondary/50 group-hover:bg-primary/10 group-hover:text-primary'}
                        `}>
                            <Icon className="w-8 h-8" />
                        </div>
                    </div>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground mt-2 pt-2 border-t">
                     <span>{typeName || "Device"}</span>
                     <span className="font-mono hidden md:inline-block">{device.ip_address || "N/A"}</span>
                </div>
            </CardContent>
        </Card>
    )
}

export default function DashboardPage() {
  const [devices, setDevices] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [deviceTypes, setDeviceTypes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // View State: 'all' | 'room' | 'type'
  const [viewMode, setViewMode] = useState<string>("all");

  useEffect(() => {
    async function loadData() {
      try {
        const [devicesRes, typesRes, roomsRes] = await Promise.all([
          fetchDevices(),
          fetchDeviceTypes(),
          fetchRooms()
        ]);
        
        setDevices(Array.isArray(devicesRes) ? devicesRes : (devicesRes.results || []));
        setDeviceTypes(Array.isArray(typesRes) ? typesRes : (typesRes.results || []));
        setRooms(Array.isArray(roomsRes) ? roomsRes : (roomsRes.results || []));
      } catch (e) {
        console.error("Failed to load dashboard data", e);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  // Helpers for lookups
  const getRoomName = (id: any) => {
      const room = rooms.find(r => r.id === id);
      return room ? room.name : "Unassigned";
  };
  
  const getTypeName = (id: any) => {
      const type = deviceTypes.find(t => t.id === id);
      return type ? type.name : "Unknown Type";
  };

  // Grouping Logic
  const groupedContent = useMemo(() => {
    if (devices.length === 0) return null;

    if (viewMode === 'room') {
        // Group by Room
        const groups: Record<string, any[]> = {};
        
        devices.forEach(d => {
            const rId = getId(d.room);
            const rName = rId ? getRoomName(rId) : "Unassigned";
            if (!groups[rName]) groups[rName] = [];
            groups[rName].push(d);
        });

        // Ensure all rooms exist even if empty (optional, but good for completeness)
        rooms.forEach(r => {
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
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                         {groupDevices.map(d => (
                             <DeviceCard 
                                key={d.id} 
                                device={d} 
                                typeName={getTypeName(getId(d.device_type))}
                                // roomName hidden since we are in room section
                             />
                         ))}
                    </div>
                 )}
            </div>
        ));
    }

    if (viewMode === 'type') {
        const groups: Record<string, any[]> = {};
        
        devices.forEach(d => {
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
                 <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {groupDevices.map(d => (
                            <DeviceCard 
                            key={d.id} 
                            device={d} 
                            roomName={getRoomName(getId(d.room))}
                            // typeName hidden
                            />
                        ))}
                </div>
            </div>
        ));
    }

    // Default: 'all'
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {devices.map(d => (
                <DeviceCard 
                    key={d.id} 
                    device={d}
                    roomName={getRoomName(getId(d.room))}
                    typeName={getTypeName(getId(d.device_type))}
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
         {isLoading ? (
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1,2,3,4].map(i => (
                    <Card key={i}><CardContent className="h-40 flex items-center justify-center"><Skeleton className="h-20 w-20 rounded-full" /></CardContent></Card>
                ))}
             </div>
         ) : devices.length === 0 ? (
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
