"use client"

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import {
  GripVertical,
  RotateCcw,
  Check,
  FolderPlus,
  Upload,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import SmartDeviceCard from './SmartDeviceCard';
import DeviceFolder from './DeviceFolder';
import type { GridItem, DashboardLayout, GridFolderItem } from '@/lib/dashboard-grid';
import { getItemId } from '@/lib/dashboard-grid';

// ─── Types ────────────────────────────────────────────────────────

type DropZone = 'left' | 'middle' | 'right';

interface DraggableDeviceGridProps {
  layout: DashboardLayout;
  devices: any[];
  deviceTypes: any[];
  rooms: any[];
  editMode: boolean;
  onToggleEditMode: () => void;
  onMoveItem: (from: number, to: number) => void;
  onCreateFolder: (deviceA: number, deviceB: number) => void;
  onAddToFolder: (folderId: string, deviceId: number) => void;
  onRemoveFromFolder: (folderId: string, deviceId: number) => void;
  onRenameFolder: (folderId: string, name: string) => void;
  onDissolveFolder: (folderId: string) => void;
  onResetLayout: () => void;
  onRevertToShared?: () => void;
  isAdmin?: boolean;
  isSaving?: boolean;
  onSetAsShared?: () => void;
}

// ─── Sortable wrapper with 3-zone drop indicators ────────────────

function SortableGridItem({
  item,
  editMode,
  isDragActive,
  isDropTarget,
  dropZone,
  canMerge,
  isAbsorbing,
  children,
}: {
  item: GridItem;
  editMode: boolean;
  isDragActive: boolean;
  isDropTarget: boolean;
  dropZone: DropZone | null;
  canMerge: boolean;
  isAbsorbing: boolean;
  children: React.ReactNode;
}) {
  const id = getItemId(item);
  const {
    attributes,
    listeners,
    setNodeRef,
    isDragging,
  } = useSortable({
    id,
    disabled: !editMode,
  });

  // Don't apply sorting transforms — items stay in place during drag.
  // The 3-zone indicators show where the item will land instead.
  const style: React.CSSProperties = {
    opacity: isDragging ? 0 : 1,
    zIndex: isDragging ? 50 : 'auto',
  };

  const showLeft = isDropTarget && dropZone === 'left';
  const showMiddle = isDropTarget && dropZone === 'middle';
  const showRight = isDropTarget && dropZone === 'right';

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-sortable-id={id}
      className={cn(
        "relative group/sortable",
        editMode && !isDragActive && "cursor-grab active:cursor-grabbing",
        editMode && isDragActive && !isDragging && "cursor-default",
      )}
      {...attributes}
      {...(editMode ? listeners : {})}
    >
      {/* ── Left zone: glowing insert-before line (centered in the gap between cards) ── */}
      {showLeft && (
        <div className="absolute -left-[10px] top-1 bottom-1 w-[3px] bg-primary rounded-full z-30 shadow-[0_0_8px_2px] shadow-primary/50" />
      )}

      {/* ── Right zone: glowing insert-after line (centered in the gap between cards) ── */}
      {showRight && (
        <div className="absolute -right-[10px] top-1 bottom-1 w-[3px] bg-primary rounded-full z-30 shadow-[0_0_8px_2px] shadow-primary/50" />
      )}

      {/* Scale wrapper for merge / absorb effects */}
      <div className={cn(
        "transition-all duration-200 rounded-xl",
        showMiddle && canMerge && "scale-[1.06] ring-2 ring-primary/70 shadow-lg shadow-primary/25 animate-pulse",
        showMiddle && !canMerge && "ring-2 ring-muted-foreground/20",
        isAbsorbing && "scale-95 opacity-60 transition-all duration-300",
      )}>
        {children}
      </div>

      {/* Hover grip overlay — scales dynamically with card size */}
      {editMode && !isDragging && !isDragActive && (
        <div className="absolute inset-0 z-20 rounded-xl bg-black/0 group-hover/sortable:bg-black/[0.03] dark:group-hover/sortable:bg-white/[0.04] transition-colors duration-200 pointer-events-none flex items-center justify-center">
          <div className="opacity-0 group-hover/sortable:opacity-40 transition-opacity duration-200 h-1/3 max-h-12 min-h-5 aspect-square flex items-center justify-center">
            <GripVertical className="w-full h-full text-foreground drop-shadow" />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main grid component ──────────────────────────────────────────

export default function DraggableDeviceGrid({
  layout,
  devices,
  deviceTypes,
  rooms,
  editMode,
  onToggleEditMode,
  onMoveItem,
  onCreateFolder,
  onAddToFolder,
  onRemoveFromFolder,
  onRenameFolder,
  onDissolveFolder,
  onResetLayout,
  onRevertToShared,
  isAdmin,
  isSaving,
  onSetAsShared,
}: DraggableDeviceGridProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [dropZone, setDropZone] = useState<DropZone | null>(null);
  const [mergeTargetId, setMergeTargetId] = useState<string | null>(null);

  // Refs for perf-safe zone computation (avoid stale closures / excess re-renders)
  const overIdRef = useRef<string | null>(null);
  const dropZoneRef = useRef<DropZone | null>(null);

  // ── Lookup helpers ─────────────────────────────────────────
  const deviceMap = new Map(devices.map((d: any) => [d.id, d]));
  const getDevice = (id: number) => deviceMap.get(id);
  const getDeviceTypeObj = (id: any) => {
    const typeId = typeof id === 'object' && id !== null ? id.id : id;
    return deviceTypes.find((t: any) => t.id === typeId);
  };
  const getRoomName = (id: any) => {
    const roomId = typeof id === 'object' && id !== null ? id.id : id;
    const room = rooms.find((r: any) => r.id === roomId);
    return room ? room.name : '';
  };

  const getRoomIcon = (id: any) => {
    const roomId = typeof id === 'object' && id !== null ? id.id : id;
    const room = rooms.find((r: any) => r.id === roomId);
    return room?.icon || '';
  };

  // ── Can the middle zone merge? ────────────────────────────
  const canMerge = (() => {
    if (!activeId || !overId || activeId === overId) return false;
    const activeItem = layout.items.find((it) => getItemId(it) === activeId);
    const overItem = layout.items.find((it) => getItemId(it) === overId);
    if (!activeItem || !overItem || activeItem.type !== 'device') return false;
    if (overItem.type === 'device') return true;
    if (overItem.type === 'folder' && overItem.deviceIds.length < 4) return true;
    return false;
  })();

  // ── Track pointer position for 3-zone calculation ─────────
  // Runs only while a drag is active. Looks up the hovered element
  // via data attribute, measures its rect, and computes the zone
  // based on which horizontal quarter the cursor is in
  // (25% left | 50% middle | 25% right).
  useEffect(() => {
    if (!activeId) return;

    let cachedId: string | null = null;
    let cachedEl: HTMLElement | null = null;

    const handler = (e: PointerEvent) => {
      const oid = overIdRef.current;
      if (!oid) {
        if (dropZoneRef.current !== null) {
          dropZoneRef.current = null;
          setDropZone(null);
        }
        return;
      }

      // Cache element lookup — only querySelector when over item changes
      if (oid !== cachedId) {
        cachedId = oid;
        cachedEl = document.querySelector(
          `[data-sortable-id="${oid}"]`,
        ) as HTMLElement | null;
      }
      if (!cachedEl) return;

      const rect = cachedEl.getBoundingClientRect();
      const edgeWidth = rect.width / 4; // 25% edges, 50% center

      let zone: DropZone;
      if (e.clientX < rect.left + edgeWidth) {
        zone = 'left';
      } else if (e.clientX > rect.right - edgeWidth) {
        zone = 'right';
      } else {
        zone = 'middle';
      }

      if (zone !== dropZoneRef.current) {
        dropZoneRef.current = zone;
        setDropZone(zone);
      }
    };

    window.addEventListener('pointermove', handler, { passive: true });
    return () => window.removeEventListener('pointermove', handler);
  }, [activeId]);

  // ── dnd-kit sensors ────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const newId =
      event.over && String(event.over.id) !== String(event.active.id)
        ? String(event.over.id)
        : null;

    if (newId !== overIdRef.current) {
      overIdRef.current = newId;
      setOverId(newId);

      // Reset zone when over target changes — pointermove will re-compute
      dropZoneRef.current = null;
      setDropZone(null);
    }
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      const currentZone = dropZoneRef.current;

      // Reset tracking state
      dropZoneRef.current = null;
      overIdRef.current = null;
      setDropZone(null);

      if (!over || active.id === over.id) {
        setActiveId(null);
        setOverId(null);
        return;
      }

      const activeIdx = layout.items.findIndex(
        (it) => getItemId(it) === String(active.id),
      );
      const overIdx = layout.items.findIndex(
        (it) => getItemId(it) === String(over.id),
      );

      if (activeIdx === -1 || overIdx === -1) {
        setActiveId(null);
        setOverId(null);
        return;
      }

      const activeItem = layout.items[activeIdx];
      const overItem = layout.items[overIdx];

      // ── Middle zone → merge ──────────────────────────────
      if (currentZone === 'middle') {
        // Device onto device → create folder
        if (activeItem.type === 'device' && overItem.type === 'device') {
          setMergeTargetId(String(over.id));
          setActiveId(null);
          setOverId(null);
          setTimeout(() => {
            onCreateFolder(activeItem.deviceId, overItem.deviceId);
            setMergeTargetId(null);
          }, 300);
          return;
        }

        // Device onto folder → add to folder
        if (
          activeItem.type === 'device' &&
          overItem.type === 'folder' &&
          overItem.deviceIds.length < 4
        ) {
          setMergeTargetId(String(over.id));
          setActiveId(null);
          setOverId(null);
          setTimeout(() => {
            onAddToFolder(overItem.folderId, activeItem.deviceId);
            setMergeTargetId(null);
          }, 300);
          return;
        }
      }

      // ── Left / Right zone → reorder ──────────────────────
      setActiveId(null);
      setOverId(null);

      // moveItem uses splice(from,1) then splice(to,0,item):
      //   after removing `from`, indices shift. Compute the correct
      //   target index for "insert before" (left) or "insert after" (right).
      let toIdx: number;
      if (currentZone === 'left') {
        toIdx = activeIdx < overIdx ? overIdx - 1 : overIdx;
      } else if (currentZone === 'right') {
        toIdx = activeIdx < overIdx ? overIdx : overIdx + 1;
      } else {
        // Middle zone fallback (merge not possible) → reorder to position
        toIdx = overIdx;
      }

      if (toIdx !== activeIdx) {
        onMoveItem(activeIdx, toIdx);
      }
    },
    [layout, onMoveItem, onCreateFolder, onAddToFolder],
  );

  // ── Render items ───────────────────────────────────────────
  const sortableIds = layout.items.map(getItemId);

  // Find the active item for the drag overlay
  const activeItem = activeId
    ? layout.items.find((it) => getItemId(it) === activeId)
    : null;

  const isMiddleMerge = dropZone === 'middle' && canMerge;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2 justify-end">
        {isSaving && (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Saving…
          </span>
        )}
        {editMode && isAdmin && onSetAsShared && (
          <Button
            variant="outline"
            size="sm"
            onClick={onSetAsShared}
            className="text-muted-foreground"
            title="Set this layout as the default for all users who haven't customized their own"
          >
            <Upload className="h-3.5 w-3.5 mr-1.5" />
            Set as Default for All
          </Button>
        )}
        {editMode && onRevertToShared && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRevertToShared}
            className="text-muted-foreground"
            title="Revert to the layout set by your admin"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            Revert to Admin Default
          </Button>
        )}
        {editMode && (
          <Button
            variant="outline"
            size="sm"
            onClick={onResetLayout}
            className="text-muted-foreground"
            title="Reset to default flat layout with no folders"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            Reset Layout
          </Button>
        )}
        {editMode && (
          <Button
            variant="default"
            size="sm"
            onClick={onToggleEditMode}
          >
            <Check className="h-3.5 w-3.5 mr-1.5" />
            Done
          </Button>
        )}
      </div>

      {/* Hint */}
      {editMode && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/20 text-sm text-muted-foreground">
          <FolderPlus className="h-4 w-4 text-primary shrink-0" />
          <span>
            Drag to the <strong>center</strong> of another card to create a folder,
            or to the <strong>edges</strong> to reorder.
          </span>
        </div>
      )}

      {/* Grid */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={sortableIds} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 items-start">
            {layout.items.map((item, index) => {
              const id = getItemId(item);
              const isDropTarget = editMode && overId === id && activeId !== id;
              const isAbsorbing = mergeTargetId === id;

              return (
                <SortableGridItem
                  key={id}
                  item={item}
                  editMode={editMode}
                  isDragActive={!!activeId}
                  isDropTarget={isDropTarget}
                  dropZone={isDropTarget ? dropZone : null}
                  canMerge={isDropTarget ? canMerge : false}
                  isAbsorbing={isAbsorbing}
                >
                  {item.type === 'device' ? (
                    <SmartDeviceCard
                      device={getDevice(item.deviceId) || { id: item.deviceId, name: 'Unknown', status: 'offline', current_state: {} }}
                      deviceType={getDeviceTypeObj(getDevice(item.deviceId)?.device_type)}
                      roomName={getRoomName(getDevice(item.deviceId)?.room)}
                      roomIcon={getRoomIcon(getDevice(item.deviceId)?.room)}
                      animationIndex={index}
                      readOnly={editMode}
                    />
                  ) : (
                    <DeviceFolder
                      folder={item}
                      devices={item.deviceIds.map(getDevice).filter(Boolean)}
                      getDeviceType={getDeviceTypeObj}
                      getRoomName={getRoomName}
                      getRoomIcon={getRoomIcon}
                      editMode={editMode}
                      onRename={onRenameFolder}
                      onRemoveDevice={onRemoveFromFolder}
                      onDissolve={onDissolveFolder}
                      animationIndex={index}
                    />
                  )}
                </SortableGridItem>
              );
            })}
          </div>
        </SortableContext>

        {/* Drag overlay — ghost of the dragged item */}
        <DragOverlay dropAnimation={null}>
          {activeItem && (
            <div
              className={cn(
                'pointer-events-none transition-all duration-200',
                // Middle-zone merge: shrink overlay toward target (iOS-style)
                isMiddleMerge
                  ? 'opacity-60 scale-75 rotate-1'
                  : 'opacity-90 rotate-2 scale-105 shadow-2xl',
              )}
            >
              {activeItem.type === 'device' ? (
                <SmartDeviceCard
                  device={getDevice(activeItem.deviceId) || { id: activeItem.deviceId, name: 'Unknown', status: 'offline', current_state: {} }}
                  deviceType={getDeviceTypeObj(getDevice(activeItem.deviceId)?.device_type)}
                  roomName={getRoomName(getDevice(activeItem.deviceId)?.room)}
                  roomIcon={getRoomIcon(getDevice(activeItem.deviceId)?.room)}
                  readOnly
                />
              ) : (
                <div className="w-52 h-40 rounded-xl border-2 border-dashed border-primary/40 bg-muted/60 flex items-center justify-center">
                  <span className="text-sm font-medium text-muted-foreground">{activeItem.name}</span>
                </div>
              )}
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
