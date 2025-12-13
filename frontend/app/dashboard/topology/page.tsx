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
import { DeviceData } from '@/hooks/useTopologyLayout';
import { fetchTopology } from '@/lib/apiClient';
import { toast } from 'sonner';

export default function TopologyPage() {
  const [devices, setDevices] = useState<DeviceData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const onlineCount = devices.filter(d => d.is_online).length;
  const offlineCount = devices.length - onlineCount;

  const loadTopology = async () => {
    try {
      const data = await fetchTopology();
      
      // Transform API response to DeviceData[]
      // API returns: { name, ip, type, status, children: [...] }
      // We need to flatten this into a list of devices with uplink_device
      
      const rootDevice: DeviceData = {
        id: 'server-01', // Generate a stable ID for the root
        name: data.name,
        device_type: 'gateway', // Map 'server' to 'gateway' for visualization
        ip_address: data.ip,
        is_online: data.status === 'online',
        uplink_device: null
      };

      const childDevices: DeviceData[] = (data.children || []).map((child: any) => ({
        id: `device-${child.id}`,
        name: child.name,
        device_type: mapDeviceType(child.device_type),
        ip_address: child.ip_address,
        is_online: child.status === 'online',
        uplink_device: 'server-01', // All children connect to the server
        room_name: child.room_name
      }));

      setDevices([rootDevice, ...childDevices]);
    } catch (error) {
      console.error("Failed to load topology:", error);
      toast.error("Failed to load network topology");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadTopology();

    // Poll for updates every 5 seconds
    const intervalId = setInterval(() => {
      // Silent refresh (don't set global loading state)
      fetchTopology().then(data => {
        const rootDevice: DeviceData = {
          id: 'server-01',
          name: data.name,
          device_type: 'gateway',
          ip_address: data.ip,
          is_online: data.status === 'online',
          uplink_device: null
        };

        const childDevices: DeviceData[] = (data.children || []).map((child: any) => ({
          id: `device-${child.id}`,
          name: child.name,
          device_type: mapDeviceType(child.device_type),
          ip_address: child.ip_address,
          is_online: child.status === 'online',
          uplink_device: 'server-01',
          room_name: child.room_name
        }));

        setDevices([rootDevice, ...childDevices]);
      }).catch(console.error);
    }, 5000);

    return () => clearInterval(intervalId);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    // Force a fresh fetch from the API
    loadTopology();
  };

  // Helper to map API device types to UI types
  const mapDeviceType = (apiType: string): DeviceData['device_type'] => {
    // API types: light, thermostat, etc.
    // UI types: 'gateway' | 'switch' | 'ap' | 'client'
    // For now, map everything else to 'client'
    return 'client';
  };

  const SidebarContent = () => (
    <div className="flex flex-col gap-4 h-full">
      {/* Network Health */}
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

      {/* Device Types - Removed as requested */}
      
      <div className="mt-auto p-4 rounded-lg bg-muted/50 border border-border">
        <p className="text-xs text-muted-foreground leading-relaxed">
          <Wifi className="w-3 h-3 inline mr-1" />
          Topology is auto-generated based on LLDP and uplink data.
        </p>
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header Toolbar */}
      <div className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-4">
          {/* Mobile Menu Trigger */}
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
                  Network Topology
                </SheetTitle>
              </SheetHeader>
              <SidebarContent />
            </SheetContent>
          </Sheet>

          <div className="flex items-center gap-2 text-foreground">
            <Network className="w-5 h-5 text-primary hidden md:block" />
            <span className="font-semibold tracking-tight">Network Topology</span>
          </div>
          <div className="h-4 w-px bg-border hidden md:block" />
        </div>
        <div className="flex items-center gap-2">
          <Button 
            size="sm" 
            className="bg-primary hover:bg-primary/90 text-primary-foreground border-0 shadow-lg shadow-primary/20"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            <span className="hidden md:inline">Refresh Topology</span>
            <span className="md:hidden">Refresh</span>
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative md:p-4 bg-muted/20">
        <div className="flex w-full h-full md:rounded-xl overflow-hidden md:border md:border-border bg-background shadow-sm relative">
          {/* Desktop Sidebar Palette */}
          <div className="w-72 border-r border-border p-4 hidden md:block overflow-y-auto bg-card/30 backdrop-blur-xl">
            <SidebarContent />
          </div>

          {/* React Flow Canvas */}
          <div className="flex-1 h-full relative">
             <TopologyCanvas devices={devices} />
          </div>
        </div>
      </div>
    </div>
  );
}
