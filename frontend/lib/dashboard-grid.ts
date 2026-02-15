/**
 * Dashboard Grid Layout — Data model & persistence
 *
 * Supports two item types on the grid:
 *   1. `device`  – a single SmartDeviceCard
 *   2. `folder`  – a Google-Home-style folder grouping 2-4 devices
 *
 * Layout is stored per-user in localStorage (and later via API).
 */

// ─── Types ────────────────────────────────────────────────────────

export interface GridDeviceItem {
  type: 'device';
  deviceId: number;
}

export interface GridFolderItem {
  type: 'folder';
  folderId: string;        // client-generated uuid
  name: string;
  deviceIds: number[];     // 2-4 devices
}

export type GridItem = GridDeviceItem | GridFolderItem;

/** Full layout blob persisted to storage */
export interface DashboardLayout {
  version: 1;
  /** Ordered list — render order matches array index */
  items: GridItem[];
}

// ─── Helpers ──────────────────────────────────────────────────────

const STORAGE_KEY = 'homeforge_dashboard_layout';

/** Generate a short unique id for folders */
export function generateFolderId(): string {
  return `folder-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

/** Load layout from localStorage (returns null if none saved) */
export function loadLayout(): DashboardLayout | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.version === 1 && Array.isArray(parsed.items)) {
      return parsed as DashboardLayout;
    }
    return null;
  } catch {
    return null;
  }
}

/** Save layout to localStorage */
export function saveLayout(layout: DashboardLayout): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
}

/** Clear saved layout (reset to default) */
export function clearLayout(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Build default layout from a flat device list (no folders, natural order).
 * Used when no saved layout exists or after reset.
 */
export function buildDefaultLayout(deviceIds: number[]): DashboardLayout {
  return {
    version: 1,
    items: deviceIds.map((id) => ({ type: 'device' as const, deviceId: id })),
  };
}

/**
 * Reconcile saved layout with current device list:
 *  – Removes references to devices that no longer exist
 *  – Appends new devices not yet in layout
 *  – Dissolves folders left with <2 devices
 */
export function reconcileLayout(
  saved: DashboardLayout,
  currentDeviceIds: number[],
): DashboardLayout {
  const currentSet = new Set(currentDeviceIds);
  const accountedFor = new Set<number>();

  const reconciledItems: GridItem[] = [];

  for (const item of saved.items) {
    if (item.type === 'device') {
      if (currentSet.has(item.deviceId)) {
        reconciledItems.push(item);
        accountedFor.add(item.deviceId);
      }
      // else: device deleted, skip
    } else {
      // folder — filter to still-existing devices
      const validIds = item.deviceIds.filter((id) => currentSet.has(id));
      if (validIds.length >= 2) {
        reconciledItems.push({ ...item, deviceIds: validIds });
        validIds.forEach((id) => accountedFor.add(id));
      } else {
        // dissolve folder: put remaining devices as singles
        validIds.forEach((id) => {
          reconciledItems.push({ type: 'device', deviceId: id });
          accountedFor.add(id);
        });
      }
    }
  }

  // Append any new devices not in layout
  for (const id of currentDeviceIds) {
    if (!accountedFor.has(id)) {
      reconciledItems.push({ type: 'device', deviceId: id });
    }
  }

  return { version: 1, items: reconciledItems };
}

/**
 * Get a unique sortable ID string for each grid item.
 */
export function getItemId(item: GridItem): string {
  return item.type === 'device' ? `device-${item.deviceId}` : item.folderId;
}

/**
 * Check if a device is already inside any folder in the layout.
 */
export function isDeviceInFolder(layout: DashboardLayout, deviceId: number): boolean {
  return layout.items.some(
    (item) => item.type === 'folder' && item.deviceIds.includes(deviceId),
  );
}

/**
 * Get all device IDs that are part of the layout (both standalone and in-folder).
 */
export function getAllDeviceIds(layout: DashboardLayout): number[] {
  const ids: number[] = [];
  for (const item of layout.items) {
    if (item.type === 'device') {
      ids.push(item.deviceId);
    } else {
      ids.push(...item.deviceIds);
    }
  }
  return ids;
}
