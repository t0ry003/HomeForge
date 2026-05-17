"use client"

import React, { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Cpu, X, Pencil, FolderOpen, Ungroup } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { getIconComponent } from '@/lib/icons';
import { cn } from '@/lib/utils';
import SmartDeviceCard from './SmartDeviceCard';
import type { GridFolderItem } from '@/lib/dashboard-grid';

interface DeviceFolderProps {
  folder: GridFolderItem;
  /** Full device objects looked up from the folder's deviceIds */
  devices: any[];
  /** Device type lookup */
  getDeviceType: (id: any) => any;
  /** Room name lookup */
  getRoomName: (id: any) => string;
  /** Room icon lookup */
  getRoomIcon?: (id: any) => string;
  /** Whether the grid is in edit/drag mode */
  editMode: boolean;
  /** Callbacks */
  onRename: (folderId: string, name: string) => void;
  onRemoveDevice: (folderId: string, deviceId: number) => void;
  onDissolve: (folderId: string) => void;
  /** Animation stagger index */
  animationIndex?: number;
}

/**
 * Home-app style folder that shows a 2×2 mini-preview grid of device icons.
 * Expands into a full overlay showing the actual device cards when clicked.
 */
export default function DeviceFolder({
  folder,
  devices,
  getDeviceType,
  getRoomName,
  getRoomIcon,
  editMode,
  onRename,
  onRemoveDevice,
  onDissolve,
  animationIndex = 0,
}: DeviceFolderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [nameValue, setNameValue] = useState(folder.name);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when entering rename mode
  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isRenaming]);

  const handleRenameSubmit = () => {
    const trimmed = nameValue.trim();
    if (trimmed && trimmed !== folder.name) {
      onRename(folder.folderId, trimmed);
    } else {
      setNameValue(folder.name);
    }
    setIsRenaming(false);
  };

  // Get up to 4 preview icons
  const previewDevices = devices.slice(0, 4);

  return (
    <>
      {/* ── Collapsed folder tile ──────────────────────────── */}
      <Card
        className={cn(
          "group relative cursor-pointer select-none transition-all duration-300 overflow-hidden",
          "border-2 border-dashed border-border/60 hover:border-primary/40",
          "bg-gradient-to-br from-muted/60 via-muted/30 to-background",
          "hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]",
          editMode && "ring-2 ring-primary/20 animate-[wiggle_0.4s_ease-in-out_infinite]",
          "animate-[jelly-in_0.5s_cubic-bezier(0.2,0.6,0.35,1)_both]",
        )}
        style={{ animationDelay: `${animationIndex * 60}ms` }}
        onClick={() => !editMode && setIsOpen(true)}
      >
        {/* Edit mode controls */}
        {editMode && (
          <div className="absolute top-1.5 right-1.5 z-20 flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-full bg-background/80 hover:bg-destructive/20"
              onClick={(e) => { e.stopPropagation(); onDissolve(folder.folderId); }}
              title="Ungroup folder"
            >
              <Ungroup className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        {/* 2×2 icon preview grid — fills the card area */}
        <div className="grid grid-cols-2 gap-1.5 p-3 flex-1">
          {[0, 1, 2, 3].map((idx) => {
            const device = previewDevices[idx];
            if (!device) {
              return (
                <div
                  key={`empty-${idx}`}
                  className="rounded-lg bg-muted/30 border border-border/15 aspect-square"
                />
              );
            }
            const Icon = (device.icon ? getIconComponent(device.icon) : null) || Cpu;
            const isOnline = device.status === 'online' || device.is_online;
            return (
              <div
                key={device.id}
                className={cn(
                  "rounded-lg flex items-center justify-center transition-colors relative overflow-hidden aspect-square",
                  isOnline
                    ? "bg-green-500/10 border border-green-500/20"
                    : "bg-muted/50 border border-border/30",
                )}
              >
                <Icon className={cn(
                  "w-7 h-7",
                  isOnline ? "text-green-600 dark:text-green-400" : "text-muted-foreground/60",
                )} />
                {/* Tiny status dot */}
                <div className={cn(
                  "absolute bottom-1 right-1 h-1.5 w-1.5 rounded-full",
                  isOnline ? "bg-green-500" : "bg-zinc-400",
                )} />
              </div>
            );
          })}
        </div>

        {/* Folder name + count */}
        <div className="px-3 pb-2.5">
          {isRenaming ? (
            <Input
              ref={inputRef}
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onBlur={handleRenameSubmit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRenameSubmit();
                if (e.key === 'Escape') { setNameValue(folder.name); setIsRenaming(false); }
              }}
              onClick={(e) => e.stopPropagation()}
              className="h-7 text-sm font-medium px-1.5"
            />
          ) : (
            <div className="flex items-center gap-1.5">
              <h3
                className="text-sm font-semibold truncate flex-1"
                onDoubleClick={(e) => { e.stopPropagation(); setIsRenaming(true); }}
                title="Double-click to rename"
              >
                {folder.name}
              </h3>
              <Badge variant="secondary" className="text-[10px] h-4 px-1.5 py-0 shrink-0">
                {devices.length}
              </Badge>
            </div>
          )}
        </div>
      </Card>

      {/* ── Expanded overlay ───────────────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0 bg-black/50 backdrop-blur-md"
              onClick={() => setIsOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />

            {/* Folder content panel */}
            <motion.div
              className="relative z-10 w-full sm:max-w-lg max-h-[90vh] overflow-hidden rounded-t-3xl sm:rounded-2xl bg-card/95 backdrop-blur-xl shadow-2xl border border-border/50"
              initial={{ scale: 0.9, opacity: 0, y: 60 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 40 }}
              transition={{ type: 'spring', damping: 28, stiffness: 350 }}
            >
              {/* Drag indicator (mobile) */}
              <div className="flex justify-center pt-3 pb-1 sm:hidden">
                <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-3 pb-3 sm:pt-5">
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <div className="flex items-center justify-center h-9 w-9 rounded-xl bg-primary/10 shrink-0">
                    <FolderOpen className="h-4.5 w-4.5 text-primary" />
                  </div>
                  {isRenaming ? (
                    <Input
                      ref={inputRef}
                      value={nameValue}
                      onChange={(e) => setNameValue(e.target.value)}
                      onBlur={handleRenameSubmit}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRenameSubmit();
                        if (e.key === 'Escape') { setNameValue(folder.name); setIsRenaming(false); }
                      }}
                      className="h-8 text-base font-semibold w-40"
                    />
                  ) : (
                    <div className="flex items-center gap-1.5 min-w-0">
                      <h2
                        className="text-base font-semibold truncate cursor-pointer hover:text-primary transition-colors"
                        onClick={() => setIsRenaming(true)}
                        title="Click to rename"
                      >
                        {folder.name}
                      </h2>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0 text-muted-foreground hover:text-primary"
                        onClick={() => setIsRenaming(true)}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full hover:bg-muted shrink-0"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Device cards */}
              <div className="overflow-y-auto max-h-[70vh] px-4 pb-5 sm:pb-6">
                <div className="grid grid-cols-2 gap-3">
                  {devices.map((device, i) => (
                    <div key={device.id} className="relative group/card">
                      <SmartDeviceCard
                        device={device}
                        deviceType={getDeviceType(device.device_type)}
                        roomName={getRoomName(device.room)}
                        roomIcon={getRoomIcon ? getRoomIcon(device.room) : ''}
                        animationIndex={i}
                      />
                      {/* Remove from folder button */}
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute -top-1.5 -right-1.5 h-5 w-5 opacity-0 group-hover/card:opacity-100 transition-opacity z-20 rounded-full shadow-sm"
                        onClick={() => {
                          onRemoveDevice(folder.folderId, device.id);
                          if (devices.length <= 2) setIsOpen(false);
                        }}
                        title="Remove from folder"
                      >
                        <X className="h-2.5 w-2.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
