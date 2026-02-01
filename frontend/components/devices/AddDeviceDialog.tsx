'use client';

import { useState, useEffect } from 'react';
import { fetchDeviceTypes, fetchRooms, registerDevice } from '@/lib/apiClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from "sonner";
import { Loader2, ArrowLeft, ArrowRight, Plus } from 'lucide-react';
import { IconPicker } from './IconPicker';

interface AddDeviceDialogProps {
  onDeviceAdded?: () => void;
  trigger?: React.ReactNode;
}

export function AddDeviceDialog({ onDeviceAdded, trigger }: AddDeviceDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Data sources
  const [deviceTypes, setDeviceTypes] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Form Data
  const [formData, setFormData] = useState({
    type_id: '',
    room_id: '',
    name: '',
    ip_address: '',
    icon: ''
  });

  // Load data when dialog opens
  useEffect(() => {
    if (open) {
      setLoadingData(true);
      Promise.all([fetchDeviceTypes(), fetchRooms()])
        .then(([typesRes, roomsRes]) => {
            const types = Array.isArray(typesRes) ? typesRes : (typesRes.results || []);
            const roomList = Array.isArray(roomsRes) ? roomsRes : (roomsRes.results || []);
            setDeviceTypes(types.filter((t: any) => t.approved));
            setRooms(roomList);
        })
        .catch((err) => {
           console.error(err);
           toast.error("Failed to load options");
        })
        .finally(() => setLoadingData(false));
    } else {
        // Reset form on close
        setStep(1);
        setFormData({ type_id: '', room_id: '', name: '', ip_address: '', icon: '' });
    }
  }, [open]);

  const handleNext = () => {
    if (step === 1 && !formData.type_id) {
      toast.error("Please select a device type");
      return;
    }
    if (step === 2 && !formData.room_id) {
      toast.error("Please select a room");
      return;
    }
    setStep(s => s + 1);
  };

  const handleBack = () => setStep(s => s - 1);

  // Generate initial state from device type structure
  const generateInitialState = (deviceType: any): Record<string, any> => {
    const initialState: Record<string, any> = {};
    const structure = deviceType?.definition?.structure || [];
    
    structure.forEach((node: any) => {
      if (node.type !== 'mcu') {
        // Set default values based on node type
        if (node.type === 'switch') {
          initialState[node.id] = false; // Relays default to off
        } else if (node.type === 'temperature') {
          initialState[node.id] = 0.0; // Temperature
        } else if (node.type === 'humidity') {
          initialState[node.id] = 0.0; // Humidity
        } else if (node.type === 'light') {
          initialState[node.id] = 0.0; // Light level
        } else if (node.type === 'motion') {
          initialState[node.id] = false; // No motion
        } else if (node.type === 'co2') {
          initialState[node.id] = 0.0; // CO2 ppm
        } else {
          initialState[node.id] = 0.0; // Default numeric
        }
      }
    });
    
    return initialState;
  };

  const handleSubmit = async () => {
    if (!formData.name) {
      toast.error("Please enter a device name");
      return;
    }
    
    // Find selected device type to generate initial state
    const selectedType = deviceTypes.find(t => t.id.toString() === formData.type_id);
    const initialState = selectedType ? generateInitialState(selectedType) : {};
    
    setLoading(true);
    try {
      await registerDevice({
        name: formData.name,
        device_type: parseInt(formData.type_id),
        room: parseInt(formData.room_id),
        ip_address: formData.ip_address,
        icon: formData.icon,
        current_state: initialState
      });
      toast.success("Device added successfully");
      setOpen(false);
      if (onDeviceAdded) onDeviceAdded();
    } catch (error: any) {
      toast.error(error.message || "Failed to add device");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="w-4 h-4 mr-2" /> Add Device
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Device</DialogTitle>
          <DialogDescription>
            Step {step} of 3: {step === 1 ? 'Device Type' : step === 2 ? 'Room' : 'Details'}
          </DialogDescription>
        </DialogHeader>

        {loadingData ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="py-4">
            {/* Step 1: Device Type */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Device Type</Label>
                  <Select 
                    value={formData.type_id} 
                    onValueChange={(val) => setFormData({...formData, type_id: val})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type..." />
                    </SelectTrigger>
                    <SelectContent>
                      {deviceTypes.length === 0 ? (
                         <div className="p-2 text-sm text-center text-muted-foreground">No approved types</div>
                      ) : (
                        deviceTypes.map((dt) => (
                           <SelectItem key={dt.id} value={String(dt.id)}>{dt.name}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Step 2: Room */}
            {step === 2 && (
              <div className="space-y-4">
                 <div className="space-y-2">
                  <Label>Select Room</Label>
                  <Select 
                    value={formData.room_id} 
                    onValueChange={(val) => setFormData({...formData, room_id: val})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select room..." />
                    </SelectTrigger>
                    <SelectContent>
                       {rooms.length === 0 ? (
                         <div className="p-2 text-sm text-center text-muted-foreground">No rooms found</div>
                       ) : ( 
                        rooms.map((r) => (
                          <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>
                        ))
                       )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Step 3: Details */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input 
                    id="name" 
                    value={formData.name} 
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g. Kitchen Light"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ip">IP Address</Label>
                  <Input 
                    id="ip" 
                    value={formData.ip_address} 
                    onChange={(e) => setFormData({...formData, ip_address: e.target.value})}
                    placeholder="192.168.1.50"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Icon</Label>
                  <div className="flex items-center gap-4">
                    <IconPicker 
                      value={formData.icon} 
                      onChange={(val) => setFormData({...formData, icon: val})} 
                    />
                    <div className="flex flex-col">
                        <span className="text-sm font-medium">
                            {formData.icon ? formData.icon : "No icon selected"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                            Tap the box to search icons
                        </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex flex-row justify-between sm:justify-between items-center sm:space-x-2">
            
             <Button 
                variant="ghost" 
                onClick={handleBack} 
                disabled={step === 1 || loading}
                className={step === 1 ? "invisible" : ""}
             >
               <ArrowLeft className="w-4 h-4 mr-2" /> Back
             </Button>

            {step < 3 ? (
              <Button onClick={handleNext} disabled={loadingData}>
                Next <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={loading || loadingData}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Add Device
              </Button>
            )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
