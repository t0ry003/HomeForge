'use client';

import React, { useState, useEffect } from 'react';
import { Network, RefreshCw, ShieldCheck, AlertCircle, Menu, Wifi } from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import TopologyCanvas from '@/components/topology/TopologyCanvas';
import { fetchTopology } from '@/lib/apiClient';
import { toast } from 'sonner';

export default function TopologyPage() {
  const [nodes, setNodes] = useState([]); 
  const [edges, setEdges] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Helper to count online/offline based on nodes
  const onlineCount = nodes.filter((n: any) => n.data?.status === 'online').length;
  const offlineCount = nodes.length - onlineCount;

  const fetchData = async () => {
    const data = await fetchTopology();
    if (data && data.nodes) {
        setNodes(data.nodes);
        setEdges(data.edges || []);
    }
    return data;
  };

  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    
    // Add minimum delay to show animation (UX)
    const minDelay = new Promise(resolve => setTimeout(resolve, 800));
    
    try {
        await Promise.all([fetchData(), minDelay]);
    } catch (error: any) {
        // Silent fail on auto-refresh or minimal error log
        console.error("Refresh failed:", error);
    } finally {
        setIsRefreshing(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    
    const init = async () => {
        try {
            await fetchData();
        } catch (error: any) {
            console.error("Failed to load topology data:", error);
            toast.error(error.message || "Failed to load network data");
        } finally {
            if (mounted) setIsLoading(false);
        }
    };
    
    init();
    
    // Auto-refresh mechanism
    // We use a ref to the handler to avoid stale closures in setInterval if logic becomes complex,
    // but for this simple toggle, we just need to ensure we don't stack intervals.
    const interval = setInterval(() => {
        // Trigger the animation and fetch
        // We use the function from the scope. Note: in [] dependency, this uses initial render closure.
        // Since isRefreshing check might be stale (always false), we rely on the 5s interval being enough spacing.
        handleRefresh();
    }, 5000);
    
    return () => {
        mounted = false;
        clearInterval(interval);
    };
  }, []);

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
          Real-time topology map.
        </p>
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-border bg-background backdrop-blur">
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
            className={`transition-all duration-300 border-0 shadow-lg ${
                isRefreshing 
                ? 'bg-green-500 hover:bg-green-600 shadow-green-500/20 text-white' 
                : 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary/20'
            }`}
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative md:p-4 bg-background/20">
        <div className="flex w-full h-full md:rounded-xl overflow-hidden md:border md:border-border bg-background shadow-sm relative">
          <div className="w-72 border-r border-border p-4 hidden md:block overflow-y-auto bg-background/30 backdrop-blur-xl">
            <SidebarContent />
          </div>

          <div className="flex-1 h-full relative">
             <TopologyCanvas nodes={nodes} edges={edges} />
          </div>
        </div>
      </div>
    </div>
  );
}
