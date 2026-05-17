'use client';

import { useState, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchDeviceTypes, getMediaUrl, importDeviceTypesFromFile, proposeDeviceType } from '@/lib/apiClient';
import { useRouter } from 'next/navigation';
import { useUser } from '@/components/user-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Search,
  Cpu,
  Thermometer,
  Droplets,
  Activity,
  Sun,
  ToggleLeft,
  Wind,
  Code2,
  BookOpen,
  Cable,
  User,
  Calendar,
  ArrowRight,
  Package,
  Upload,
  FileJson,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { PageTooltip } from '@/components/onboarding/PageTooltip';

// Sensor type icon mapping (matches device builder)
const SENSOR_ICONS: Record<string, { icon: React.ElementType; color: string }> = {
  mcu: { icon: Cpu, color: 'text-blue-500' },
  temperature: { icon: Thermometer, color: 'text-orange-500' },
  humidity: { icon: Droplets, color: 'text-cyan-500' },
  motion: { icon: Activity, color: 'text-red-500' },
  light: { icon: Sun, color: 'text-yellow-500' },
  switch: { icon: ToggleLeft, color: 'text-green-500' },
  co2: { icon: Wind, color: 'text-gray-500' },
};

function DeviceTypeCard({ deviceType }: { deviceType: any }) {
  const router = useRouter();
  const structure = deviceType.definition?.structure || [];
  const sensors = structure.filter((s: any) => s.type !== 'mcu');
  const controlCount = deviceType.card_template?.controls?.length || 0;
  const hasFirmware = !!deviceType.firmware_code;
  const hasWiring = !!deviceType.wiring_diagram_image || !!deviceType.wiring_diagram_base64;
  const wiringImage = deviceType.wiring_diagram_image || deviceType.wiring_diagram_base64;
  const hasDocs = !!deviceType.documentation;

  return (
    <Card
      className="group cursor-pointer transition-all hover:shadow-lg hover:border-primary/30 hover:bg-card/80"
      onClick={() => router.push(`/dashboard/device-collection/${deviceType.id}`)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
              {deviceType.name}
            </h3>
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              {deviceType.proposed_by_username && (
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {deviceType.proposed_by_username}
                </span>
              )}
              {deviceType.created_at && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(deviceType.created_at).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {/* Mini wiring diagram */}
        {wiringImage && (
          <div className="rounded-md border border-border overflow-hidden bg-white dark:bg-muted/20">
            <img
              src={getMediaUrl(wiringImage)}
              alt={`${deviceType.name} wiring diagram`}
              className="w-full h-32 object-contain p-1.5"
            />
          </div>
        )}

        {/* Sensor Icons */}
        {sensors.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {sensors.map((sensor: any, i: number) => {
              const config = SENSOR_ICONS[sensor.type];
              if (!config) return null;
              const Icon = config.icon;
              return (
                <div
                  key={i}
                  className={cn(
                    'flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium border bg-card/50',
                    config.color
                  )}
                >
                  <Icon className="w-3 h-3" />
                  {sensor.label}
                </div>
              );
            })}
          </div>
        )}

        {/* Content availability badges */}
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline" className="text-[10px] gap-1">
            <Cpu className="w-3 h-3" />
            {controlCount} control{controlCount !== 1 ? 's' : ''}
          </Badge>
          {hasFirmware && (
            <Badge variant="outline" className="text-[10px] gap-1 border-green-500/30 text-green-600 dark:text-green-400">
              <Code2 className="w-3 h-3" />
              Code
            </Badge>
          )}
          {hasWiring && (
            <Badge variant="outline" className="text-[10px] gap-1 border-blue-500/30 text-blue-600 dark:text-blue-400">
              <Cable className="w-3 h-3" />
              Wiring
            </Badge>
          )}
          {hasDocs && (
            <Badge variant="outline" className="text-[10px] gap-1 border-purple-500/30 text-purple-600 dark:text-purple-400">
              <BookOpen className="w-3 h-3" />
              Docs
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function CardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-3 w-1/2 mt-2" />
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <div className="flex gap-1.5">
          <Skeleton className="h-6 w-16 rounded-md" />
          <Skeleton className="h-6 w-20 rounded-md" />
          <Skeleton className="h-6 w-14 rounded-md" />
        </div>
        <div className="flex gap-1.5">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function DeviceCollectionPage() {
  const [search, setSearch] = useState('');
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { user } = useUser();

  const role = user?.profile?.role || user?.role;
  const isAdmin = role === 'admin' || role === 'owner';

  const { data: deviceTypes = [], isLoading } = useQuery({
    queryKey: ['deviceTypes', 'collection'],
    queryFn: async () => {
      const res = await fetchDeviceTypes();
      return Array.isArray(res) ? res : (res.results || []);
    },
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
  });

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      if (isAdmin) {
        // Admins use the direct import endpoint (auto-approved)
        return importDeviceTypesFromFile(file);
      } else {
        // Regular users: read JSON and submit as proposal for approval
        const text = await file.text();
        let data: any;
        try {
          data = JSON.parse(text);
        } catch {
          throw new Error('Invalid JSON file. Please check the file format.');
        }
        // Handle both single object and array (take first item only)
        const device = Array.isArray(data) ? data[0] : data;
        if (!device || !device.name) {
          throw new Error('Invalid device type format. File must contain a device with a "name" field.');
        }
        // Check if a device with this name already exists in the collection
        const existing = deviceTypes.find((dt: any) => dt.name?.toLowerCase() === device.name.toLowerCase());
        if (existing) {
          throw new Error(`A device named "${device.name}" already exists in the collection.`);
        }
        // Map exported fields to proposal format
        const payload: Record<string, any> = {
          name: device.name,
          definition: device.definition || null,
          card_template: device.card_template || null,
          initial_state: device.initial_state || {},
          firmware_code: device.firmware_code || '',
          wiring_diagram_text: device.wiring_diagram_text || '',
          documentation: device.documentation || '',
        };
        // Include base64 image data if present in the export
        if (device.wiring_diagram_base64) {
          payload.wiring_diagram_base64 = device.wiring_diagram_base64;
        }
        if (device.wiring_diagram_image) {
          payload.wiring_diagram_image = device.wiring_diagram_image;
        }
        if (device.documentation_images_base64) {
          payload.documentation_images_base64 = device.documentation_images_base64;
        }
        return proposeDeviceType(payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deviceTypes'] });
      setImportDialogOpen(false);
      setImportFile(null);
      if (isAdmin) {
        toast.success('Device imported', { description: 'Device type has been added and auto-approved.' });
      } else {
        toast.success('Device submitted for approval', { description: 'An admin will review your device type shortly.' });
      }
    },
    onError: (error: any) => {
      toast.error('Import failed', { description: error?.message || 'Failed to import device type.' });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.json')) {
      toast.error('Invalid file', { description: 'Please select a .json file.' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large', { description: 'Maximum file size is 5MB.' });
      return;
    }
    setImportFile(file);
  };

  const handleImport = () => {
    if (!importFile) return;
    importMutation.mutate(importFile);
  };

  const filteredTypes = useMemo(() => {
    if (!search.trim()) return deviceTypes;
    const q = search.toLowerCase();
    return deviceTypes.filter((t: any) => {
      const nameMatch = t.name?.toLowerCase().includes(q);
      const authorMatch = t.proposed_by_username?.toLowerCase().includes(q);
      const sensorMatch = t.definition?.structure?.some(
        (s: any) => s.label?.toLowerCase().includes(q) || s.type?.toLowerCase().includes(q)
      );
      return nameMatch || authorMatch || sensorMatch;
    });
  }, [deviceTypes, search]);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <PageTooltip pageKey="device-collection" message="Browse and import community device templates, or create your own in the Device Builder." />

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Package className="w-6 h-6 text-primary" />
            Device Collection
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Browse community-built ESP32 devices. Pick one, flash the code, wire it up, and connect.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setImportDialogOpen(true)}>
            <Upload className="w-4 h-4 mr-1.5" />
            Import Device
          </Button>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search devices..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : filteredTypes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="p-4 rounded-full bg-muted/50 mb-4">
            <Package className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">
            {search ? 'No devices found' : 'No devices yet'}
          </h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md">
            {search
              ? 'Try adjusting your search terms.'
              : 'Be the first to create a device! Head to the Device Builder to get started.'}
          </p>
          {!search && (
            <Button
              className="mt-4"
              onClick={() => (window.location.href = '/dashboard/device-builder')}
            >
              <Cpu className="w-4 h-4 mr-2" />
              Build a Device
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredTypes.map((dt: any) => (
            <DeviceTypeCard key={dt.id} deviceType={dt} />
          ))}
        </div>
      )}

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={(open) => { setImportDialogOpen(open); if (!open) setImportFile(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Import Device Type</DialogTitle>
            <DialogDescription>
              {isAdmin
                ? 'Upload a device type JSON file. It will be added directly to the collection.'
                : 'Upload a device type JSON file. It will be submitted for admin approval before appearing in the collection.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="hidden"
            />

            {importFile ? (
              <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
                <FileJson className="w-8 h-8 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{importFile.name}</p>
                  <p className="text-xs text-muted-foreground">{(importFile.size / 1024).toFixed(1)} KB</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => { setImportFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div
                className="flex flex-col items-center justify-center gap-2 p-8 rounded-lg border-2 border-dashed border-muted-foreground/25 cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-8 h-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Click to select a JSON file</p>
                <p className="text-xs text-muted-foreground/70">One device type per file • Max 5MB</p>
              </div>
            )}

            {!isAdmin && (
              <p className="text-xs text-muted-foreground bg-muted/50 rounded-md p-2.5">
                <strong>Note:</strong> Your device will be reviewed by an admin before it becomes available in the collection.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setImportDialogOpen(false); setImportFile(null); }}>
              Cancel
            </Button>
            <Button onClick={handleImport} disabled={!importFile || importMutation.isPending}>
              {importMutation.isPending ? 'Importing...' : (isAdmin ? 'Import & Approve' : 'Submit for Approval')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
