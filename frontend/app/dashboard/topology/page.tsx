'use client';

import React, { useState, useEffect } from 'react';
import { Network, RefreshCw, Wifi, ShieldCheck, AlertCircle, Menu, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import TopologyCanvas from '@/components/topology/TopologyCanvas';
import { fetchDevices, fetchRooms, fetchDeviceTypes } from '@/lib/apiClient';
import { toast } from 'sonner';

export default function TopologyPage() {
  const [devices, setDevices] = useState<any[]>([]); 
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Metrics
  const onlineCount = devices.filter(d => d.status !== 'offline').length;
  const offlineCount = devices.length - onlineCount;

  // Helper to normalize DRF responses (handle pagination)
  const normalizeData = (response: any) => {
    if (Array.isArray(response)) return response;
    if (response && Array.isArray(response.results)) return response.results;
    return [];
  };

  const loadData = async () => {
    try {
      if (!isRefreshing) setIsLoading(true);
      
      // Fetch devices, rooms, and types to enrich data
      const [devicesRes, roomsRes, typesRes] = await Promise.all([
        fetchDevices(),
        fetchRooms(),
        fetchDeviceTypes()
      ]);

      const devicesData = normalizeData(devicesRes);
      const roomsData = normalizeData(roomsRes);
      const typesData = normalizeData(typesRes);
      
      // Create Room Map (ID -> Name)
      const roomMap = new Map();
      roomsData.forEach((r: any) => roomMap.set(r.id, r.name));

      // Create Device Type Map (ID -> Name)
      const typeMap = new Map();
      typesData.forEach((t: any) => typeMap.set(t.id, t.name));

      // 1. Define Root Node (HomeForge)
      const homeForgeNode = {
          id: 'homeforge',
          name: 'HomeForge',
          device_type: 'gateway',
          is_online: true,
          ip_address: '10.0.0.1', 
          status: 'online',
          roomName: 'Server Room'
      };

      // 2. Process and Sort Devices
      const mappedDevices = devicesData.map((d: any) => {
          // Resolve Device Type Name safely
          let typeName = 'client';
          const rawType = d.device_type || d.type;
          
          if (typeof rawType === 'number') {
              typeName = typeMap.get(rawType) || 'client';
          } else if (typeof rawType === 'string') {
              typeName = rawType;
          } else if (typeof rawType === 'object' && rawType?.name) {
              typeName = rawType.name;
          }

          return {
            ...d,
            device_type: typeName,
            is_online: d.status !== 'offline',
            uplink_device: d.uplink_device || 'homeforge',
            // Enrich with Room Name for display/sorting
            roomName: d.room ? roomMap.get(d.room) || 'Unassigned' : 'Unassigned'
        };
      });

      // Sort by Room Name, then by Device Name
      mappedDevices.sort((a: any, b: any) => {
        if (a.roomName === b.roomName) {
            return a.name.localeCompare(b.name);
        }
        return a.roomName.localeCompare(b.roomName);
      });

      // 3. Combine
      setDevices([homeForgeNode, ...mappedDevices]);

    } catch (error: any) {
      console.error("Failed to load topology data:", error);
      if (isLoading || isRefreshing) {
         toast.error(error.message || "Failed to load network data");
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    
    // Auto-refresh every 10s instead of 5s to reduce load
    const interval = setInterval(() => {
        loadData();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData();
  };

  const SidebarContent = () => (
    <div className="flex flex-col gap-4 h-full">
      <div>
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Network Health</div>
        <div className="grid gap-3">
            <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-card/30">
                <div className="flex items-center gap-3">
                    <ShieldCheck className="w-5 h-5 text-green-500" />
                    <span className="text-sm font-medium text-foreground">Online</span>
                </div>
                <span className="text-lg font-bold text-foreground">{onlineCount}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-card/30">
                <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <span className="text-sm font-medium text-foreground">Offline</span>
                </div>
                <span className="text-lg font-bold text-foreground">{offlineCount}</span>
            </div>
        </div>
      </div>
      
      <div className="mt-auto p-4 rounded-lg bg-muted/50 border border-border">
        <p className="text-xs text-muted-foreground leading-relaxed">
          <Wifi className="w-3 h-3 inline mr-1" />
          Live algorithmic layout. Devices sorted by Room.
        </p>
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-border bg-background/95 backdrop-blur">
        <div className="flex items-center gap-4">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden -ml-2 text-muted-foreground hover:text-foreground">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 border-r-border bg-background p-6">
              <SheetHeader className="mb-6">
                <SheetTitle className="flex items-center gap-2 text-foreground">
                  <Network className="w-5 h-5 text-primary" />
                  Topology
                </SheetTitle>
              </SheetHeader>
              <SidebarContent />
            </SheetContent>
          </Sheet>

          <div className="flex items-center gap-2 text-foreground">
            <Network className="w-5 h-5 text-primary hidden md:block" />
            <span className="font-semibold tracking-tight">Home Topology</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            size="sm" 
            className="bg-primary hover:bg-primary/90 text-primary-foreground border-0 shadow-lg shadow-primary/20"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Refresh
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative md:p-4 bg-muted/20">
        <div className="flex w-full h-full md:rounded-xl overflow-hidden md:border md:border-border bg-background shadow-sm relative">
          <div className="w-72 border-r border-border p-4 hidden md:block overflow-y-auto bg-card/30 backdrop-blur-xl">
            <SidebarContent />
          </div>

          <div className="flex-1 h-full relative">
             <TopologyCanvas devices={devices} />
          </div>
        </div>
      </div>
    </div>
  );
}
