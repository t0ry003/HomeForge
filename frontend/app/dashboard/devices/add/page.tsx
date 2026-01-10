'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetchDeviceTypes, fetchRooms, registerDevice } from '@/lib/apiClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from "sonner";
import { Loader2, ArrowLeft, ArrowRight, Check } from 'lucide-react';

export default function RegisterDevicePage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Data sources
  const [deviceTypes, setDeviceTypes] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Form Data
  const [formData, setFormData] = useState({
    type_id: '',
    room_id: '',
    name: '',
    ip_address: ''
  });

  useEffect(() => {
    async function loadData() {
      try {
        const [typesRes, roomsRes] = await Promise.all([
          fetchDeviceTypes(),
          fetchRooms()
        ]);
        // Handle paginated responses if necessary, but assuming lists for now based on API Client
        const types = Array.isArray(typesRes) ? typesRes : (typesRes.results || []);
        const roomList = Array.isArray(roomsRes) ? roomsRes : (roomsRes.results || []);
        
        // Filter for approved device types only
        setDeviceTypes(types.filter((t: any) => t.approved));
        setRooms(roomList);
      } catch (err) {
        toast.error("Failed to load form data");
        console.error(err);
      } finally {
        setLoadingData(false);
      }
    }
    loadData();
  }, []);

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

  const handleSubmit = async () => {
    if (!formData.name) {
      toast.error("Please enter a device name");
      return;
    }
    
    setLoading(true);
    try {
      await registerDevice({
        name: formData.name,
        device_type: parseInt(formData.type_id),
        room: parseInt(formData.room_id),
        ip_address: formData.ip_address
      });
      toast.success("Device registered successfully!");
      router.push('/dashboard');
    } catch (error: any) {
      toast.error(error.message || "Failed to register device");
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin" /></div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Register New Device</CardTitle>
          <CardDescription>Step {step} of 3</CardDescription>
        </CardHeader>
        <CardContent>
          
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
                    <SelectValue placeholder="Choose a device type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {deviceTypes.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground text-center">No approved device types found.</div>
                    ) : (
                        deviceTypes.map((dt) => (
                        <SelectItem key={dt.id} value={String(dt.id)}>
                            {dt.name}
                        </SelectItem>
                        ))
                    )}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                    Choose the model of the device you are adding. Only approved device types are listed.
                </p>
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
                    <SelectValue placeholder="Choose a room..." />
                  </SelectTrigger>
                  <SelectContent>
                    {rooms.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground text-center">No rooms found.</div>
                    ) : (
                        rooms.map((r) => (
                        <SelectItem key={r.id} value={String(r.id)}>
                            {r.name}
                        </SelectItem>
                        ))
                    )}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                    Where is this device located?
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Details */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="dev-name">Device Name</Label>
                <Input 
                  id="dev-name" 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g. Living Room Lamp"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ip-addr">IP Address (Optional)</Label>
                <Input 
                  id="ip-addr" 
                  value={formData.ip_address}
                  onChange={(e) => setFormData({...formData, ip_address: e.target.value})}
                  placeholder="192.168.1.x"
                />
              </div>
            </div>
          )}

        </CardContent>
        <CardFooter className="flex justify-between">
          {step > 1 ? (
            <Button variant="outline" onClick={handleBack} disabled={loading}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
          ) : (
            <div></div> // Spacer
          )}

          {step < 3 ? (
            <Button onClick={handleNext}>
              Next <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? 'Registering...' : 'Complete Registration'}
            </Button>
          )}
        </CardFooter>
      </Card>
      
      {/* Step Indicators */}
      <div className="flex justify-center mt-6 gap-2">
        <div className={`h-2 w-2 rounded-full ${step >= 1 ? 'bg-primary' : 'bg-muted'}`} />
        <div className={`h-2 w-2 rounded-full ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
        <div className={`h-2 w-2 rounded-full ${step >= 3 ? 'bg-primary' : 'bg-muted'}`} />
      </div>
    </div>
  );
}
