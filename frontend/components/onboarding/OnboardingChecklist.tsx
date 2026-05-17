'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
  X,
  Home,
  Cpu,
  PlusCircle,
  Wrench,
  Network,
  UserCog,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchRooms, fetchDeviceTypes, fetchDevices } from '@/lib/apiClient';

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  action?: () => void;
  actionLabel?: string;
  href?: string;
  checkFn?: () => Promise<boolean>;
}

interface OnboardingChecklistProps {
  isAdmin?: boolean;
  onAddDevice?: () => void;
  deviceCount?: number;
  roomCount?: number;
  deviceTypeCount?: number;
}

const STORAGE_KEY = 'onboarding_checklist_dismissed';
const COMPLETED_KEY = 'onboarding_checklist_completed';

export function OnboardingChecklist({ isAdmin = false, onAddDevice, deviceCount, roomCount, deviceTypeCount }: OnboardingChecklistProps) {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(true); // start hidden until checked
  const [collapsed, setCollapsed] = useState(false);
  const [completedItems, setCompletedItems] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const isDismissed = localStorage.getItem(STORAGE_KEY) === 'true';
    setDismissed(isDismissed);
    if (isDismissed) {
      setLoading(false);
      return;
    }

    // Check completion status from props or API
    async function checkProgress() {
      const completed = new Set<string>();
      completed.add('account'); // If they're on dashboard, account is done

      // Use props if available, otherwise fetch
      if (roomCount !== undefined) {
        if (roomCount > 0) completed.add('rooms');
      } else {
        try {
          const rooms = await fetchRooms();
          if (Array.isArray(rooms) && rooms.length > 0) completed.add('rooms');
        } catch {}
      }

      if (deviceTypeCount !== undefined) {
        if (deviceTypeCount > 0) completed.add('device_types');
      } else {
        try {
          const types = await fetchDeviceTypes();
          if (Array.isArray(types) && types.length > 0) completed.add('device_types');
        } catch {}
      }

      if (deviceCount !== undefined) {
        if (deviceCount > 0) completed.add('first_device');
      } else {
        try {
          const devices = await fetchDevices();
          if (Array.isArray(devices) && devices.length > 0) completed.add('first_device');
        } catch {}
      }

      // Check localStorage for manually completed items
      try {
        const stored = JSON.parse(localStorage.getItem(COMPLETED_KEY) || '[]');
        stored.forEach((id: string) => completed.add(id));
      } catch {}

      setCompletedItems(completed);
      setLoading(false);
    }
    checkProgress();
  }, [deviceCount, roomCount, deviceTypeCount]);

  const markCompleted = (id: string) => {
    setCompletedItems(prev => {
      const next = new Set(prev);
      next.add(id);
      const stored = Array.from(next);
      localStorage.setItem(COMPLETED_KEY, JSON.stringify(stored));
      return next;
    });
  };

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setDismissed(true);
  };

  if (dismissed || loading) return null;

  const items: ChecklistItem[] = [
    {
      id: 'account',
      title: 'Create your account',
      description: 'Sign up and get access to HomeForge',
      icon: CheckCircle2,
    },
    ...(isAdmin ? [{
      id: 'rooms',
      title: 'Set up rooms',
      description: 'Organize your smart home by location',
      icon: Home,
      href: '/dashboard/admin/rooms',
      actionLabel: 'Manage Rooms',
    }] : []),
    ...(isAdmin ? [{
      id: 'device_types',
      title: 'Import device types',
      description: 'Get templates for your hardware',
      icon: Cpu,
      href: '/dashboard/device-collection',
      actionLabel: 'Browse Collection',
    }] : []),
    {
      id: 'first_device',
      title: 'Add your first device',
      description: 'Connect a physical device to HomeForge',
      icon: PlusCircle,
      action: onAddDevice,
      actionLabel: 'Add Device',
    },
    {
      id: 'device_builder',
      title: 'Explore Device Builder',
      description: 'Design custom smart hardware',
      icon: Wrench,
      href: '/dashboard/device-builder',
      actionLabel: 'Open Builder',
    },
    {
      id: 'topology',
      title: 'Check Network Topology',
      description: 'View your device network graph',
      icon: Network,
      href: '/dashboard/topology',
      actionLabel: 'View Topology',
    },
    {
      id: 'settings',
      title: 'Customize your profile',
      description: 'Set your avatar and accent color',
      icon: UserCog,
      href: '/dashboard/settings',
      actionLabel: 'Open Settings',
    },
  ];

  const completedCount = items.filter(i => completedItems.has(i.id)).length;
  const allDone = completedCount === items.length;

  // Auto-dismiss if all items are done
  if (allDone) return null;

  const progressPercent = Math.round((completedCount / items.length) * 100);

  return (
    <Card className="relative overflow-hidden">
      {/* Progress bar at top */}
      <div className="absolute top-0 left-0 h-1 bg-primary/20 w-full">
        <div
          className="h-full bg-primary transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <CardHeader className="pb-2 pt-5 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base font-semibold">Getting Started</CardTitle>
          <span className="text-xs text-muted-foreground">
            {completedCount}/{items.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCollapsed(c => !c)}>
            {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={handleDismiss}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>

      {!collapsed && (
        <CardContent className="pt-2 pb-4">
          <div className="space-y-1">
            {items.map(item => {
              const isCompleted = completedItems.has(item.id);
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    isCompleted ? 'opacity-60' : 'hover:bg-muted/50'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 text-muted-foreground shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${isCompleted ? 'line-through' : ''}`}>
                      {item.title}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                  </div>
                  {!isCompleted && (item.href || item.action) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs shrink-0 h-7"
                      onClick={() => {
                        if (item.action) {
                          item.action();
                        } else if (item.href) {
                          markCompleted(item.id);
                          router.push(item.href);
                        }
                      }}
                    >
                      {item.actionLabel}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
