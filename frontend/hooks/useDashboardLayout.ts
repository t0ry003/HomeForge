"use client"

import { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  DashboardLayout,
  GridItem,
  GridFolderItem,
  loadLayout,
  saveLayout,
  clearLayout,
  buildDefaultLayout,
  reconcileLayout,
  generateFolderId,
  getAllDeviceIds,
} from '@/lib/dashboard-grid';
import {
  fetchDashboardLayout,
  saveDashboardLayout,
  deleteDashboardLayout,
  updateDeviceOrder,
} from '@/lib/apiClient';

export type DeviceOrder = 'room' | 'type' | 'status' | 'name' | 'custom';

/**
 * Hook that manages the dashboard grid layout state.
 *
 * - Fetches layout from API on mount (falls back to localStorage offline)
 * - Auto-reconciles when the device list changes
 * - Debounce-saves to API (and mirrors to localStorage as cache)
 * - Flushes pending saves immediately when exiting edit mode ("Done")
 * - Provides mutation helpers (reorder, create/rename/delete folder, etc.)
 */
export function useDashboardLayout(deviceIds: number[]) {
  const queryClient = useQueryClient();
  const [layout, setLayout] = useState<DashboardLayout | null>(null);
  const [editMode, setEditModeRaw] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deviceOrder, setDeviceOrderState] = useState<DeviceOrder>('custom');
  const prevDeviceIdsRef = useRef<string>('');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initializedRef = useRef(false);
  const layoutSetCount = useRef(0);
  const layoutRef = useRef<DashboardLayout | null>(null);
  const hasPendingSaveRef = useRef(false);
  const skipNextPersistRef = useRef(false);

  // Keep ref in sync with latest layout so flush/unmount can access it
  useEffect(() => {
    layoutRef.current = layout;
  }, [layout]);

  // ── Fetch layout from API ────────────────────────────────────
  const { data: apiLayoutData, isSuccess: apiFetched, isError: apiFailed } = useQuery({
    queryKey: ['dashboardLayout'],
    queryFn: fetchDashboardLayout,
    staleTime: Infinity,     // never auto-refetch; we manage saves ourselves
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1,
  });

  // ── Immediate save to API ────────────────────────────────────
  const saveToApi = useCallback((layoutToSave: DashboardLayout) => {
    hasPendingSaveRef.current = false;
    setIsSaving(true);
    saveDashboardLayout(layoutToSave)
      .then(() => {
        queryClient.setQueryData(['dashboardLayout'], { layout: layoutToSave, is_personal: true });
      })
      .catch(() => {})
      .finally(() => setIsSaving(false));
  }, [queryClient]);

  // ── Debounced save to API + localStorage ─────────────────────
  const scheduleSave = useCallback((newLayout: DashboardLayout) => {
    // Always mirror to localStorage immediately (offline cache)
    saveLayout(newLayout);
    // Debounce API call
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    hasPendingSaveRef.current = true;
    saveTimerRef.current = setTimeout(() => {
      saveToApi(newLayout);
    }, 800);
  }, [saveToApi]);

  // ── Flush pending save immediately (cancel timer, save now) ──
  const flushSave = useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    const current = layoutRef.current;
    if (current && hasPendingSaveRef.current) {
      saveToApi(current);
    }
  }, [saveToApi]);

  // On unmount, flush any pending save (fire-and-forget)
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      if (hasPendingSaveRef.current && layoutRef.current) {
        saveDashboardLayout(layoutRef.current).catch(() => {});
        hasPendingSaveRef.current = false;
      }
    };
  }, []);

  // ── Controlled edit mode — flush save on "Done" ──────────────
  const setEditMode = useCallback((mode: boolean) => {
    // Exiting edit mode → flush any pending debounced save immediately
    if (!mode) {
      flushSave();
    }
    setEditModeRaw(mode);
  }, [flushSave]);

  // ── Initialize from API response (or localStorage fallback) ──
  useEffect(() => {
    if (initializedRef.current || deviceIds.length === 0) return;

    if (apiFetched) {
      initializedRef.current = true;
      // Mark current device IDs so the reconcile effect below doesn't re-fire
      prevDeviceIdsRef.current = deviceIds.slice().sort((a, b) => a - b).join(',');
      // Extract device_order from API response
      const apiOrder = apiLayoutData?.device_order as DeviceOrder | undefined;
      if (apiOrder) setDeviceOrderState(apiOrder);
      const apiLayout = apiLayoutData?.layout as DashboardLayout | null;
      if (apiLayout && apiLayout.version === 1 && Array.isArray(apiLayout.items)) {
        setLayout(reconcileLayout(apiLayout, deviceIds));
      } else {
        // No API layout — try localStorage, else build default
        const saved = loadLayout();
        if (saved) {
          setLayout(reconcileLayout(saved, deviceIds));
        } else {
          setLayout(buildDefaultLayout(deviceIds));
        }
      }
    } else if (apiFailed) {
      // API unreachable — use localStorage offline
      initializedRef.current = true;
      prevDeviceIdsRef.current = deviceIds.slice().sort((a, b) => a - b).join(',');
      const saved = loadLayout();
      if (saved) {
        setLayout(reconcileLayout(saved, deviceIds));
      } else {
        setLayout(buildDefaultLayout(deviceIds));
      }
    }
  }, [apiFetched, apiFailed, apiLayoutData, deviceIds]);

  // ── Reconcile when device list changes (after init) ──────────
  useEffect(() => {
    const key = deviceIds.slice().sort((a, b) => a - b).join(',');
    if (key === prevDeviceIdsRef.current || deviceIds.length === 0) return;
    prevDeviceIdsRef.current = key;

    setLayout((prev) => {
      if (!prev) return buildDefaultLayout(deviceIds);
      const reconciled = reconcileLayout(prev, deviceIds);
      // If new devices were added (reconciled has more device references), save immediately
      // so the new device isn't lost on refresh
      const prevIds = new Set(getAllDeviceIds(prev));
      const newIds = getAllDeviceIds(reconciled);
      const hasNewDevices = newIds.some((id) => !prevIds.has(id));
      if (hasNewDevices) {
        // Schedule an immediate save (not debounced) for new devices
        saveLayout(reconciled);
        saveDashboardLayout(reconciled).catch(() => {});
      }
      return reconciled;
    });
  }, [deviceIds]);

  // ── Persist on change (skip initial set from init effect) ────
  useEffect(() => {
    if (!layout) return;
    layoutSetCount.current++;
    if (layoutSetCount.current <= 1) {
      // First set is from init — just mirror to localStorage, don't save to API
      saveLayout(layout);
      return;
    }
    // Skip if flagged (reset/revert already handled their own API calls)
    if (skipNextPersistRef.current) {
      skipNextPersistRef.current = false;
      saveLayout(layout); // still mirror to localStorage
      return;
    }
    scheduleSave(layout);
  }, [layout, scheduleSave]);

  // ── Mutation helpers ─────────────────────────────────────────

  /** Move item from one index to another */
  const moveItem = useCallback((fromIndex: number, toIndex: number) => {
    setLayout((prev) => {
      if (!prev) return prev;
      const items = [...prev.items];
      const [moved] = items.splice(fromIndex, 1);
      items.splice(toIndex, 0, moved);
      return { ...prev, items };
    });
  }, []);

  /** Create a folder from two device grid-items by dragging one onto another */
  const createFolder = useCallback(
    (deviceIdA: number, deviceIdB: number, name?: string) => {
      setLayout((prev) => {
        if (!prev) return prev;
        const items = prev.items.filter(
          (it) =>
            !(it.type === 'device' && (it.deviceId === deviceIdA || it.deviceId === deviceIdB)),
        );
        const oldIndexA = prev.items.findIndex(
          (it) => it.type === 'device' && it.deviceId === deviceIdA,
        );
        const insertAt = Math.min(oldIndexA >= 0 ? oldIndexA : items.length, items.length);

        const folder: GridFolderItem = {
          type: 'folder',
          folderId: generateFolderId(),
          name: name || 'New Folder',
          deviceIds: [deviceIdA, deviceIdB],
        };
        items.splice(insertAt, 0, folder);
        return { ...prev, items };
      });
    },
    [],
  );

  /** Add a device into an existing folder (max 4) */
  const addToFolder = useCallback((folderId: string, deviceId: number) => {
    setLayout((prev) => {
      if (!prev) return prev;
      const items = prev.items
        .filter((it) => !(it.type === 'device' && it.deviceId === deviceId))
        .map((it) => {
          if (it.type === 'folder' && it.folderId === folderId) {
            if (it.deviceIds.length >= 4 || it.deviceIds.includes(deviceId)) return it;
            return { ...it, deviceIds: [...it.deviceIds, deviceId] };
          }
          return it;
        });
      return { ...prev, items };
    });
  }, []);

  /** Remove a device from a folder (dissolves folder if <2 remain) */
  const removeFromFolder = useCallback((folderId: string, deviceId: number) => {
    setLayout((prev) => {
      if (!prev) return prev;
      const items: GridItem[] = [];
      for (const it of prev.items) {
        if (it.type === 'folder' && it.folderId === folderId) {
          const remaining = it.deviceIds.filter((id) => id !== deviceId);
          if (remaining.length >= 2) {
            items.push({ ...it, deviceIds: remaining });
          } else {
            remaining.forEach((id) => items.push({ type: 'device', deviceId: id }));
          }
          items.push({ type: 'device', deviceId });
        } else {
          items.push(it);
        }
      }
      return { ...prev, items };
    });
  }, []);

  /** Rename a folder */
  const renameFolder = useCallback((folderId: string, name: string) => {
    setLayout((prev) => {
      if (!prev) return prev;
      const items = prev.items.map((it) =>
        it.type === 'folder' && it.folderId === folderId ? { ...it, name } : it,
      );
      return { ...prev, items };
    });
  }, []);

  /** Delete a folder entirely, returning its devices as standalone items */
  const dissolveFolder = useCallback((folderId: string) => {
    setLayout((prev) => {
      if (!prev) return prev;
      const items: GridItem[] = [];
      for (const it of prev.items) {
        if (it.type === 'folder' && it.folderId === folderId) {
          it.deviceIds.forEach((id) => items.push({ type: 'device', deviceId: id }));
        } else {
          items.push(it);
        }
      }
      return { ...prev, items };
    });
  }, []);

  /** Reset to default layout — flat list, no folders, natural device order.
   *  Deletes the personal layout from the API to free server memory. */
  const resetLayout = useCallback(() => {
    clearLayout();
    skipNextPersistRef.current = true; // prevent persist effect from re-saving
    const defaultLayout = buildDefaultLayout(deviceIds);
    setLayout(defaultLayout);
    // Delete personal layout from API — the default is computed client-side
    deleteDashboardLayout().catch(() => {});
    queryClient.setQueryData(['dashboardLayout'], { layout: null, is_personal: false });
  }, [deviceIds, queryClient]);

  /** Revert to admin's shared layout (delete personal, re-fetch cascade) */
  const revertToShared = useCallback(async () => {
    try {
      // Delete personal layout from API to free server memory
      await deleteDashboardLayout().catch(() => {});
      clearLayout();
      skipNextPersistRef.current = true; // prevent persist effect from re-saving
      // Re-fetch from the regular endpoint — it cascades: personal → shared → null
      const res = await fetchDashboardLayout().catch(() => null);
      const apiOrder = res?.device_order as DeviceOrder | undefined;
      if (apiOrder) setDeviceOrderState(apiOrder);
      const shared = res?.layout as DashboardLayout | null;
      if (shared && shared.version === 1 && Array.isArray(shared.items)) {
        const reconciled = reconcileLayout(shared, deviceIds);
        setLayout(reconciled);
        saveLayout(reconciled); // localStorage cache only
        queryClient.setQueryData(['dashboardLayout'], { layout: shared, is_personal: false });
      } else {
        // No shared layout exists either — go to default
        const defaultLayout = buildDefaultLayout(deviceIds);
        setLayout(defaultLayout);
        queryClient.setQueryData(['dashboardLayout'], { layout: null, is_personal: false });
      }
    } catch {
      // Fallback to default if anything goes wrong
      const defaultLayout = buildDefaultLayout(deviceIds);
      setLayout(defaultLayout);
    }
  }, [deviceIds, queryClient]);

  /** Update the device order/grouping preference and persist to API immediately */
  const setDeviceOrder = useCallback((order: DeviceOrder) => {
    setDeviceOrderState(order);
    // Fire immediately — no debounce, so it persists even on instant refresh
    updateDeviceOrder(order)
      .then(() => {
        // Update cached query data so the preference survives React Query reads
        queryClient.setQueryData(['dashboardLayout'], (prev: any) => {
          if (!prev) return { layout: null, device_order: order, is_personal: false };
          return { ...prev, device_order: order };
        });
      })
      .catch(() => {});
  }, [queryClient]);

  return {
    layout,
    editMode,
    setEditMode,
    moveItem,
    createFolder,
    addToFolder,
    removeFromFolder,
    renameFolder,
    dissolveFolder,
    resetLayout,
    revertToShared,
    isSaving,
    deviceOrder,
    setDeviceOrder,
  };
}
