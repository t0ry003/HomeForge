'use client';

import React, { useState } from 'react';
import { Network, RefreshCw, Wifi, ShieldCheck, AlertCircle, Menu } from 'lucide-react';
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
import initialData from './data.json';

// Mock Data - In a real app, this would come from your Django backend
const mockDevices: DeviceData[] = initialData as DeviceData[];

export default function TopologyPage() {
  const [devices, setDevices] = useState<DeviceData[]>(mockDevices);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const onlineCount = devices.filter(d => d.is_online).length;
  const offlineCount = devices.length - onlineCount;

  const handleRefresh = () => {
    setDevices(currentDevices => {
      return currentDevices.map(device => {
        // Only toggle clients to keep infrastructure stable
        if (device.device_type === 'client') {
          // 30% chance to toggle status
          if (Math.random() > 0.7) {
            return { ...device, is_online: !device.is_online };
          }
        }
        return device;
      });
    });
  };

  const SidebarContent = () => (
    <div className="flex flex-col gap-4 h-full">
      {/* Network Health */}
      <div>
        <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Network Health</div>
        <div className="grid gap-3">
            <div className="flex items-center justify-between p-3 rounded-lg border border-zinc-800 bg-zinc-900/30">
                <div className="flex items-center gap-3">
                    <ShieldCheck className="w-5 h-5 text-green-500" />
                    <span className="text-sm font-medium text-zinc-300">Online</span>
                </div>
                <span className="text-lg font-bold text-zinc-100">{onlineCount}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border border-zinc-800 bg-zinc-900/30">
                <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <span className="text-sm font-medium text-zinc-300">Offline</span>
                </div>
                <span className="text-lg font-bold text-zinc-100">{offlineCount}</span>
            </div>
        </div>
      </div>

      {/* Device Types */}
      <div>
        <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Infrastructure</div>
        <div className="space-y-2">
            <div className="flex items-center justify-between text-sm p-2 rounded hover:bg-zinc-900/50 transition-colors">
                <span className="text-zinc-400">Gateways</span>
                <span className="text-zinc-200 font-mono">1</span>
            </div>
            <div className="flex items-center justify-between text-sm p-2 rounded hover:bg-zinc-900/50 transition-colors">
                <span className="text-zinc-400">Switches</span>
                <span className="text-zinc-200 font-mono">1</span>
            </div>
            <div className="flex items-center justify-between text-sm p-2 rounded hover:bg-zinc-900/50 transition-colors">
                <span className="text-zinc-400">Access Points</span>
                <span className="text-zinc-200 font-mono">2</span>
            </div>
            <div className="flex items-center justify-between text-sm p-2 rounded hover:bg-zinc-900/50 transition-colors">
                <span className="text-zinc-400">Clients</span>
                <span className="text-zinc-200 font-mono">7</span>
            </div>
        </div>
      </div>

      <div className="mt-auto p-4 rounded-lg bg-zinc-900/50 border border-zinc-800">
        <p className="text-xs text-zinc-500 leading-relaxed">
          <Wifi className="w-3 h-3 inline mr-1" />
          Topology is auto-generated based on LLDP and uplink data.
        </p>
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header Toolbar */}
      <div className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-zinc-800 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-4">
          {/* Mobile Menu Trigger */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden -ml-2 text-zinc-400 hover:text-zinc-100">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 border-r-zinc-800 bg-background p-6">
              <SheetHeader className="mb-6">
                <SheetTitle className="flex items-center gap-2 text-zinc-100">
                  <Network className="w-5 h-5 text-blue-400" />
                  Network Topology
                </SheetTitle>
              </SheetHeader>
              <SidebarContent />
            </SheetContent>
          </Sheet>

          <div className="flex items-center gap-2 text-zinc-100">
            <Network className="w-5 h-5 text-blue-400 hidden md:block" />
            <span className="font-semibold tracking-tight">Network Topology</span>
          </div>
          <div className="h-4 w-px bg-zinc-800 hidden md:block" />
        </div>
        <div className="flex items-center gap-2">
          <Button 
            size="sm" 
            className="bg-blue-600 hover:bg-blue-500 text-white border-0 shadow-lg shadow-blue-900/20"
            onClick={handleRefresh}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            <span className="hidden md:inline">Refresh Topology</span>
            <span className="md:hidden">Refresh</span>
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative md:p-4 bg-background">
        <div className="flex w-full h-full md:rounded-xl overflow-hidden md:border md:border-zinc-800 bg-background shadow-sm relative">
          {/* Desktop Sidebar Palette */}
          <div className="w-72 border-r border-zinc-800 p-4 hidden md:block overflow-y-auto bg-background">
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
