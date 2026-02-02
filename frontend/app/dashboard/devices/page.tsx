'use client';

import { useState, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchDevices, fetchRooms, fetchDeviceTypes } from '@/lib/apiClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AddDeviceDialog } from '@/components/devices/AddDeviceDialog';
import { Search, RotateCw } from 'lucide-react';
import { clsx } from 'clsx';
import { getIconComponent } from '@/lib/icons';

export default function DevicesPage() {
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  // Fetch devices with React Query - cached and deduplicated
  const { data: devices = [], isLoading: loadingDevices, isRefetching } = useQuery({
    queryKey: ['devices'],
    queryFn: async () => {
      const res = await fetchDevices();
      const list = Array.isArray(res) ? res : (res.results || []);
      return list.sort((a: any, b: any) => a.id - b.id);
    },
    staleTime: 30000, // Consider fresh for 30s
    gcTime: 5 * 60 * 1000, // Keep in cache 5min
  });

  // Rooms lookup - rarely changes, cache longer
  const { data: roomsMap = new Map() } = useQuery({
    queryKey: ['rooms', 'map'],
    queryFn: async () => {
      const res = await fetchRooms();
      const list = Array.isArray(res) ? res : (res.results || []);
      const map = new Map<number, string>();
      list.forEach((r: any) => map.set(r.id, r.name));
      return map;
    },
    staleTime: 60000,
    gcTime: 10 * 60 * 1000,
  });

  // Types lookup - rarely changes, cache longer
  const { data: typesMap = new Map() } = useQuery({
    queryKey: ['deviceTypes', 'map'],
    queryFn: async () => {
      const res = await fetchDeviceTypes();
      const list = Array.isArray(res) ? res : (res.results || []);
      const map = new Map<number, string>();
      list.forEach((t: any) => map.set(t.id, t.name));
      return map;
    },
    staleTime: 60000,
    gcTime: 10 * 60 * 1000,
  });

  // Memoized filtered devices
  const filteredDevices = useMemo(() => {
    const searchLower = search.toLowerCase();
    return devices.filter((d: any) => 
      d.name.toLowerCase().includes(searchLower) || 
      (d.ip_address && d.ip_address.includes(search))
    );
  }, [devices, search]);

  // Memoized type name getter
  const getTypeName = useCallback((device: any) => {
    if (!device.device_type) return 'Unknown';
    if (typeof device.device_type === 'number') return typesMap.get(device.device_type) || `ID: ${device.device_type}`;
    if (typeof device.device_type === 'string') return device.device_type;
    if (device.device_type.name) return device.device_type.name;
    return 'Unknown';
  }, [typesMap]);

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['devices'] });
  }, [queryClient]);

  const isLoading = loadingDevices;
  const isRefreshingData = isRefetching;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
           <h1 className="text-2xl font-bold tracking-tight">Devices</h1>
           <p className="text-sm text-muted-foreground">Manage and monitor all connected devices.</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
           <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshingData}>
             <RotateCw className={clsx("w-4 h-4 mr-2", isRefreshingData && "animate-spin")} />
             Refresh
           </Button>
           <AddDeviceDialog onDeviceAdded={handleRefresh} />
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
            {isLoading ? (
               // Skeleton rows for loading state
               <>
                 {[1, 2, 3, 4, 5].map((i) => (
                   <TableRow key={i}>
                     <TableCell><Skeleton className="w-2.5 h-2.5 rounded-full" /></TableCell>
                     <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                     <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                     <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                     <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                     <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                   </TableRow>
                 ))}
               </>
            ) : filteredDevices.length === 0 ? (
               <TableRow>
                 <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No devices found.
                 </TableCell>
               </TableRow>
            ) : (
                filteredDevices.map((device: any) => {
                   const isOnline = device.status === 'online' || device.is_online;
                   const typeName = getTypeName(device);
                   const IconC = device.icon ? getIconComponent(device.icon) : null;

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
                          {device.room ? (roomsMap.get(device.room) || 'Unassigned') : <span className="text-muted-foreground italic">Unassigned</span>}
                       </TableCell>
                       <TableCell className="font-mono text-xs">{device.ip_address || 'N/A'}</TableCell>
                       <TableCell className="text-xs text-muted-foreground font-mono">
                          {IconC ? <IconC className="w-4 h-4 text-foreground/80" /> : (device.icon || '-')}
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
