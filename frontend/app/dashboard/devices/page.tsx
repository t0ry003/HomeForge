'use client';

import { useState, useEffect } from 'react';
import { fetchDevices, fetchRooms, fetchDeviceTypes } from '@/lib/apiClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from "@/components/ui/badge";
import { AddDeviceDialog } from '@/components/devices/AddDeviceDialog';
import { Search, Loader2, RotateCw } from 'lucide-react';
import { toast } from "sonner";
import { clsx } from 'clsx';
import { getIconComponent } from '@/lib/icons';

export default function DevicesPage() {
  const [devices, setDevices] = useState<any[]>([]);
  const [rooms, setRooms] = useState<Map<number, string>>(new Map());
  const [types, setTypes] = useState<Map<number, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [devicesRes, roomsRes, typesRes] = await Promise.all([
        fetchDevices(),
        fetchRooms(),
        fetchDeviceTypes()
      ]);

      const devicesList = Array.isArray(devicesRes) ? devicesRes : (devicesRes.results || []);
      const roomsList = Array.isArray(roomsRes) ? roomsRes : (roomsRes.results || []);
      const typesList = Array.isArray(typesRes) ? typesRes : (typesRes.results || []);

      setDevices(devicesList);
      
      const newRoomMap = new Map();
      roomsList.forEach((r: any) => newRoomMap.set(r.id, r.name));
      setRooms(newRoomMap);

      const newTypeMap = new Map();
      typesList.forEach((t: any) => newTypeMap.set(t.id, t.name));
      setTypes(newTypeMap);

    } catch (err) {
      console.error(err);
      toast.error("Failed to load devices");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredDevices = devices.filter(d => 
    d.name.toLowerCase().includes(search.toLowerCase()) || 
    (d.ip_address && d.ip_address.includes(search))
  );

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
           <h1 className="text-2xl font-bold tracking-tight">Devices</h1>
           <p className="text-sm text-muted-foreground">Manage and monitor all connected devices.</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
           <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
             <RotateCw className={clsx("w-4 h-4 mr-2", loading && "animate-spin")} />
             Refresh
           </Button>
           <AddDeviceDialog onDeviceAdded={loadData} />
        </div>
      </div>

      <div className="flex items-center space-x-2">
         <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search devices..." 
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
         </div>
      </div>

      <div className="border rounded-md bg-card overflow-x-auto">
        <Table className="min-w-[600px]">
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Room</TableHead>
              <TableHead>IP Address</TableHead>
              <TableHead>Icon</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
               <TableRow>
                 <TableCell colSpan={6} className="h-24 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                 </TableCell>
               </TableRow>
            ) : filteredDevices.length === 0 ? (
               <TableRow>
                 <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No devices found.
                 </TableCell>
               </TableRow>
            ) : (
                filteredDevices.map((device) => {
                   const isOnline = device.status === 'online' || device.is_online;
                   let typeName = 'Unknown';
                   if (device.device_type) {
                       if (typeof device.device_type === 'number') typeName = types.get(device.device_type) || `ID: ${device.device_type}`;
                       else if (typeof device.device_type === 'string') typeName = device.device_type;
                       else if (device.device_type.name) typeName = device.device_type.name;
                   }

                   return (
                     <TableRow key={device.id}>
                       <TableCell>
                          <div className={clsx("w-2.5 h-2.5 rounded-full", isOnline ? "bg-green-500" : "bg-red-400")} />
                       </TableCell>
                       <TableCell className="font-medium">{device.name}</TableCell>
                       <TableCell>
                          <Badge variant="outline" className="capitalize">{typeName}</Badge>
                       </TableCell>
                       <TableCell>
                          {device.room ? (rooms.get(device.room) || 'Unassigned') : <span className="text-muted-foreground italic">Unassigned</span>}
                       </TableCell>
                       <TableCell className="font-mono text-xs">{device.ip_address || 'N/A'}</TableCell>
                       <TableCell className="text-xs text-muted-foreground font-mono">
                          {(() => {
                            // Check if icon string is valid in our map, else show string (legacy FontAwesome support)
                            const IconC = device.icon ? getIconComponent(device.icon) : null;
                            if (IconC) return <IconC className="w-4 h-4 text-foreground/80" />;
                            return device.icon || '-';
                          })()}
                       </TableCell>
                     </TableRow>
                   );
                })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
