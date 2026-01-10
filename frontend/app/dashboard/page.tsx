"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { 
  Activity, 
  Thermometer, 
  Zap, 
  Wifi, 
  Plus,
  Layers,
  Home,
  Cpu
} from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { fetchDevices, fetchDeviceTypes, fetchRooms } from "@/lib/apiClient"
import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardPage() {
  const [stats, setStats] = useState({
    devicesCount: 0,
    typesCount: 0,
    roomsCount: 0
  });
  
  const [roomsData, setRoomsData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [devicesRes, typesRes, roomsRes] = await Promise.all([
          fetchDevices(),
          fetchDeviceTypes(),
          fetchRooms()
        ]);
        
        // Handle potentially paginated results
        const devices = Array.isArray(devicesRes) ? devicesRes : (devicesRes.results || []);
        const types = Array.isArray(typesRes) ? typesRes : (typesRes.results || []);
        const rooms = Array.isArray(roomsRes) ? roomsRes : (roomsRes.results || []);

        setStats({
          devicesCount: devices.length,
          typesCount: types.length,
          roomsCount: rooms.length
        });

        // Group devices by room
        const roomGroups = rooms.map((room: any) => {
            // Check formatted response from backend (expecting 'room' as ID or object)
            const roomDevices = devices.filter((d: any) => {
                 const dRoomId = (typeof d.room === 'object' && d.room !== null) ? d.room.id : d.room;
                 return String(dRoomId) === String(room.id);
            });
            return {
                ...room,
                devices: roomDevices
            };
        });
        
        // Also capture devices without a room if necessary (optional)
        // const unassigned = devices.filter(d => !d.room && !d.room_id);

        setRoomsData(roomGroups);

      } catch (e) {
        console.error("Failed to load dashboard data", e);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your connected home.
          </p>
        </div>
        <div className="flex items-center gap-2">
            <Link href="/dashboard/devices/add">
                <Button className="shadow-lg shadow-primary/20">
                    <Plus className="mr-2 h-4 w-4" /> Add Device
                </Button>
            </Link>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Devices</CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.devicesCount}</div>
            <p className="text-xs text-muted-foreground">Active endpoints</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Device Types</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.typesCount}</div>
            <p className="text-xs text-muted-foreground">Available definitions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rooms</CardTitle>
            <Home className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.roomsCount}</div>
            <p className="text-xs text-muted-foreground">Monitored spaces</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
            <Activity className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">Online</div>
            <p className="text-xs text-muted-foreground">All systems operational</p>
          </CardContent>
        </Card>
      </div>

      {/* Rooms Grid */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
            <Home className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold tracking-tight">Rooms & Devices</h2>
        </div>
        
        {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                    <Card key={i} className="bg-card/50">
                        <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
                        <CardContent><Skeleton className="h-24 w-full" /></CardContent>
                    </Card>
                ))}
            </div>
        ) : roomsData.length === 0 ? (
             <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-10">
                    <p className="text-muted-foreground mb-4">No rooms configured.</p>
                    <Link href="/dashboard/admin/rooms">
                        <Button variant="outline">Create a Room</Button>
                    </Link>
                </CardContent>
            </Card>
        ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {roomsData.map((room) => (
                    <Card key={room.id} className="flex flex-col h-full bg-card hover:shadow-md transition-shadow">
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center justify-between">
                                <span>{room.name}</span>
                                <Badge variant="secondary" className="ml-2">{room.devices.length}</Badge>
                            </CardTitle>
                            {/* <CardDescription>{room.description || "No description"}</CardDescription> */}
                        </CardHeader>
                        <CardContent className="flex-1 pb-4">
                            {room.devices.length === 0 ? (
                                <div className="text-sm text-muted-foreground py-4 text-center italic border rounded-md border-dashed border-border/50">
                                    No devices in this room
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {room.devices.map((device: any) => (
                                        <div key={device.id} className="flex items-center justify-between p-2 rounded-md bg-muted/30 border border-border/50">
                                            <div className="flex items-center gap-3">
                                                <div className="p-1.5 rounded-full bg-primary/10 text-primary">
                                                    <Cpu className="w-3 h-3" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium leading-none">{device.name}</span>
                                                    <span className="text-[10px] text-muted-foreground mt-1">
                                                        {device.ip_address || device.meta_data?.ip || "No IP"}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className={`h-2 w-2 rounded-full shadow-[0_0_4px] 
                                                ${device.status === 'online' ? 'bg-green-500 shadow-green-500' : 
                                                  device.status === 'error' ? 'bg-red-500 shadow-red-500' : 
                                                  'bg-gray-300 shadow-gray-300'}`} 
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                        <CardFooter className="pt-0 justify-end">
                            <Link href={`/dashboard/devices/add`}>
                                <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground hover:text-primary">
                                    <Plus className="mr-1 h-3 w-3" /> Add
                                </Button>
                            </Link>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        )}
      </div>
    </div>
  )
}
