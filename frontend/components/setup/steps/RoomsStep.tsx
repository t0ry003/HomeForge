'use client';

import { useState } from 'react';
import { Plus, X, ArrowRight, ArrowLeft, Loader2, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { createRoom } from '@/lib/apiClient';
import { getIconComponent } from '@/lib/icons';
import { IconPicker } from '@/components/devices/IconPicker';

interface RoomsStepProps {
  onNext: (count: number) => void;
  onBack: () => void;
}

interface SuggestedRoom {
  name: string;
  icon: string;
}

const SUGGESTED_ROOMS: SuggestedRoom[] = [
  { name: 'Living Room', icon: 'Sofa' },
  { name: 'Kitchen', icon: 'CookingPot' },
  { name: 'Bedroom', icon: 'Bed' },
  { name: 'Bathroom', icon: 'Bath' },
  { name: 'Office', icon: 'Monitor' },
  { name: 'Garage', icon: 'Warehouse' },
];

interface RoomEntry {
  name: string;
  icon: string;
}

export function RoomsStep({ onNext, onBack }: RoomsStepProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set(['Living Room', 'Kitchen', 'Bedroom']));
  const [customRooms, setCustomRooms] = useState<RoomEntry[]>([]);
  const [newRoom, setNewRoom] = useState('');
  const [newRoomIcon, setNewRoomIcon] = useState('DoorOpen');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggleRoom = (name: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const addCustomRoom = () => {
    const trimmed = newRoom.trim();
    if (!trimmed) return;
    if (selected.has(trimmed) || customRooms.some(r => r.name === trimmed)) return;
    setCustomRooms(prev => [...prev, { name: trimmed, icon: newRoomIcon }]);
    setSelected(prev => new Set([...prev, trimmed]));
    setNewRoom('');
    setNewRoomIcon('DoorOpen');
  };

  const removeCustomRoom = (name: string) => {
    setCustomRooms(prev => prev.filter(r => r.name !== name));
    setSelected(prev => {
      const next = new Set(prev);
      next.delete(name);
      return next;
    });
  };

  const handleNext = async () => {
    const roomNames = Array.from(selected);
    if (roomNames.length === 0) {
      onNext(0);
      return;
    }

    setLoading(true);
    setError('');
    try {
      await Promise.all(roomNames.map(name => {
        // Find icon from suggested or custom rooms
        const suggested = SUGGESTED_ROOMS.find(r => r.name === name);
        const custom = customRooms.find(r => r.name === name);
        const icon = suggested?.icon || custom?.icon || 'DoorOpen';
        return createRoom({ name, icon });
      }));
      onNext(roomNames.length);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create rooms.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="text-center pb-4">
        <CardTitle className="text-2xl">Set Up Rooms</CardTitle>
        <CardDescription>
          Rooms help you organize devices by their physical location. Select or add rooms you want.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Suggested rooms grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {SUGGESTED_ROOMS.map((room) => {
            const RoomIcon = getIconComponent(room.icon) || Home;
            return (
            <button
              key={room.name}
              type="button"
              onClick={() => toggleRoom(room.name)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                selected.has(room.name)
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-card hover:border-primary/50 text-foreground'
              }`}
            >
              <RoomIcon className="h-4 w-4 shrink-0" />
              {room.name}
            </button>
            );
          })}
        </div>

        {/* Custom rooms */}
        {customRooms.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {customRooms.map(room => {
              const CustomIcon = getIconComponent(room.icon) || Home;
              return (
              <span
                key={room.name}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-primary/10 text-primary text-sm font-medium"
              >
                <CustomIcon className="h-3.5 w-3.5" />
                {room.name}
                <button type="button" onClick={() => removeCustomRoom(room.name)} className="hover:text-destructive">
                  <X className="w-3 h-3" />
                </button>
              </span>
              );
            })}
          </div>
        )}

        {/* Add custom room */}
        <div className="flex gap-2">
          <IconPicker value={newRoomIcon} onChange={setNewRoomIcon} className="w-[52px] shrink-0" />
          <Input
            placeholder="Add a custom room..."
            value={newRoom}
            onChange={e => setNewRoom(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomRoom())}
          />
          <Button variant="outline" size="icon" onClick={addCustomRoom} disabled={!newRoom.trim()}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {error && (
          <p className="text-sm text-destructive text-center">{error}</p>
        )}

        {/* Actions */}
        <div className="flex justify-between pt-2">
          <Button variant="ghost" onClick={onBack} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <Button onClick={handleNext} disabled={loading} className="gap-2">
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ArrowRight className="w-4 h-4" />
            )}
            {selected.size === 0 ? 'Skip' : `Create ${selected.size} Room${selected.size > 1 ? 's' : ''}`}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
