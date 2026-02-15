"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface DeviceCardSkeletonProps {
  index?: number;
}

/**
 * A skeleton loading card that mirrors the SmartDeviceCard structure.
 * Supports staggered fade-in via the `index` prop for a wave-like entrance.
 */
export function DeviceCardSkeleton({ index = 0 }: DeviceCardSkeletonProps) {
  return (
    <Card
      className={cn(
        "relative overflow-hidden border-l-4 border-l-muted-foreground/20 animate-in fade-in-0 slide-in-from-bottom-2 fill-mode-both",
      )}
      style={{ animationDelay: `${index * 100}ms`, animationDuration: '400ms' }}
    >
      {/* Shimmer overlay */}
      <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
        <div
          className="absolute inset-0 -translate-x-full animate-[shimmer_1.8s_ease-in-out_infinite]"
          style={{ animationDelay: `${index * 150}ms` }}
        >
          <div className="h-full w-1/2 bg-gradient-to-r from-transparent via-foreground/[0.04] to-transparent" />
        </div>
      </div>

      {/* Header: title + badge */}
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="flex flex-col gap-2 w-full">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-24 rounded" />
            <Skeleton className="h-4 w-14 rounded-full ml-auto" />
          </div>
          <div className="flex items-center gap-1.5">
            <Skeleton className="h-3 w-16 rounded" />
            <Skeleton className="h-3 w-12 rounded-full" />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Top: icon + status area */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-12 w-12 rounded-xl" />
          <div className="flex flex-col items-end gap-1.5">
            <Skeleton className="h-2.5 w-14 rounded" />
            <Skeleton className="h-2.5 w-20 rounded" />
          </div>
        </div>

        {/* Controls area: toggle row */}
        <div className="flex items-center justify-between px-3 py-2 rounded-xl border border-border/30 h-14">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-3.5 w-16 rounded" />
          </div>
          <Skeleton className="h-5 w-9 rounded-full" />
        </div>

        {/* Controls area: slider row */}
        <div className="flex items-center justify-between px-3 py-2 rounded-xl border border-border/30 h-14">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-3.5 w-12 rounded" />
          </div>
          <Skeleton className="h-2 w-20 rounded-full" />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Estimate how many skeleton cards to show based on viewport width.
 * Uses the same breakpoints as the real device grid (1/2/3/4/5 columns)
 * and fills approximately 2 rows.
 */
function useResponsiveSkeletonCount(): number {
  const [count, setCount] = useState(6); // SSR fallback

  useEffect(() => {
    function calc() {
      const w = window.innerWidth;
      let cols = 1;
      if (w >= 1280) cols = 5;
      else if (w >= 1024) cols = 4;
      else if (w >= 768) cols = 3;
      else if (w >= 640) cols = 2;
      return cols * 2; // ~2 rows
    }
    setCount(calc());
    // No resize listener needed — this only matters on initial load
  }, []);

  return count;
}

/**
 * Grid of skeleton cards matching the device dashboard layout.
 * Uses cached device count when available, otherwise estimates from screen width.
 */
export function DeviceCardSkeletonGrid({ count }: { count?: number }) {
  const responsiveCount = useResponsiveSkeletonCount();
  const finalCount = count || responsiveCount;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {Array.from({ length: finalCount }, (_, i) => (
        <DeviceCardSkeleton key={i} index={i} />
      ))}
    </div>
  );
}
