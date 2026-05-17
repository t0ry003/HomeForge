'use client';

import { useState, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { fetchDeviceType, exportSingleDeviceType, getMediaUrl } from '@/lib/apiClient';
import { MarkdownRenderer } from '@/components/ui/markdown-editor';
import ReactFlow, {
  ReactFlowProvider,
  Node,
  Edge,
  MarkerType,
  NodeProps,
  Position,
  Handle,
} from 'reactflow';
import 'reactflow/dist/style.css';
import Prism from 'prismjs';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  Code2,
  BookOpen,
  Cable,
  Info,
  Copy,
  Download,
  Wifi,
  Lock,
  Server,
  Cpu,
  Thermometer,
  Droplets,
  Activity,
  Sun,
  ToggleLeft,
  Wind,
  User,
  Calendar,
  CheckCircle2,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const SENSOR_ICONS: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  mcu: { icon: Cpu, color: 'text-blue-500', label: 'MCU' },
  temperature: { icon: Thermometer, color: 'text-orange-500', label: 'Temperature' },
  humidity: { icon: Droplets, color: 'text-cyan-500', label: 'Humidity' },
  motion: { icon: Activity, color: 'text-red-500', label: 'Motion' },
  light: { icon: Sun, color: 'text-yellow-500', label: 'Light' },
  switch: { icon: ToggleLeft, color: 'text-green-500', label: 'Relay' },
  co2: { icon: Wind, color: 'text-gray-500', label: 'CO2' },
};

// Available sensor defs for ReactFlow node colors
const AVAILABLE_SENSORS = [
  { type: 'mcu', icon: Cpu, color: 'text-blue-500 border-blue-500/50 bg-blue-500/10' },
  { type: 'temperature', icon: Thermometer, color: 'text-orange-500 border-orange-500/50 bg-orange-500/10' },
  { type: 'humidity', icon: Droplets, color: 'text-cyan-500 border-cyan-500/50 bg-cyan-500/10' },
  { type: 'motion', icon: Activity, color: 'text-red-500 border-red-500/50 bg-red-500/10' },
  { type: 'light', icon: Sun, color: 'text-yellow-500 border-yellow-500/50 bg-yellow-500/10' },
  { type: 'switch', icon: ToggleLeft, color: 'text-green-500 border-green-500/50 bg-green-500/10' },
  { type: 'co2', icon: Wind, color: 'text-gray-500 border-gray-500/50 bg-gray-500/10' },
];

// ReactFlow custom node (matches admin page)
const CustomNode = ({ data }: NodeProps) => {
  const IconEl = data.icon || Cpu;
  const isMCU = data.type === 'mcu';
  return (
    <div className={`
      relative flex flex-col items-center justify-center p-3 rounded-xl backdrop-blur-md
      ${isMCU ? 'w-24 h-24' : 'w-20 h-20'}
      border ${data.color || 'border-blue-500/50 text-blue-500'} bg-card/80
    `}>
      <Handle type="source" position={Position.Top} className="!bg-muted-foreground opacity-20" />
      <div className={`p-2 rounded-full mb-1 ${isMCU ? 'bg-blue-500/20' : 'bg-muted/50'}`}>
        <IconEl className={`${isMCU ? 'w-6 h-6' : 'w-5 h-5'} ${(data.color || '').split(' ')[0]}`} />
      </div>
      {!isMCU && (
        <span className="text-[9px] font-bold uppercase tracking-wider text-center leading-tight">
          {data.label}
        </span>
      )}
      <Handle type="target" position={Position.Bottom} className="!bg-muted-foreground opacity-20" />
    </div>
  );
};

const nodeTypes = { custom: CustomNode };

function reconstructGraph(structure: any[]): { nodes: Node[]; edges: Edge[] } {
  const resultNodes: Node[] = [];
  const resultEdges: Edge[] = [];
  if (!Array.isArray(structure)) return { nodes: [], edges: [] };
  structure.forEach((node) => {
    const sensorDef = AVAILABLE_SENSORS.find((s) => s.type === node.type);
    resultNodes.push({
      id: node.id,
      type: 'custom',
      position: node.position || { x: 0, y: 0 },
      data: {
        label: node.label,
        type: node.type,
        icon: sensorDef?.icon || Cpu,
        color: sensorDef?.color,
      },
      draggable: false,
      connectable: false,
    });
    if (node.parentId) {
      resultEdges.push({
        id: `e-${node.id}-${node.parentId}`,
        source: node.id,
        target: node.parentId,
        animated: true,
        style: { stroke: 'var(--primary)', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--primary)' },
        focusable: false,
      });
    }
  });
  return { nodes: resultNodes, edges: resultEdges };
}

const REQUIRED_VARIABLES = [
  { name: 'wifi_ssid', placeholder: '{{WIFI_SSID}}', icon: Wifi, label: 'WiFi SSID' },
  { name: 'wifi_password', placeholder: '{{WIFI_PASSWORD}}', icon: Lock, label: 'WiFi Password' },
  { name: 'server_ip', placeholder: '{{SERVER_IP}}', icon: Server, label: 'Server IP' },
] as const;

function getServerIpDefault(): string {
  if (typeof window !== 'undefined') {
    return window.location.hostname;
  }
  return '';
}

export default function DeviceCollectionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);

  const [deployOpen, setDeployOpen] = useState(false);
  const [wifiSsid, setWifiSsid] = useState('');
  const [wifiPassword, setWifiPassword] = useState('');
  const [serverIp, setServerIp] = useState(getServerIpDefault());

  const { data: deviceType, isLoading, error } = useQuery({
    queryKey: ['deviceType', id],
    queryFn: () => fetchDeviceType(id),
    enabled: !!id,
    staleTime: 60000,
  });

  const handleExport = useCallback(async () => {
    try {
      const res = await exportSingleDeviceType(id);
      const disposition = res.headers.get('content-disposition');
      let filename = `${deviceType?.name?.toLowerCase().replace(/\s+/g, '_') || 'device-type'}.json`;
      if (disposition) {
        const match = disposition.match(/filename="?([^"]+)"?/);
        if (match) filename = match[1];
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Export downloaded');
    } catch (e: any) {
      toast.error('Export failed', { description: e.message });
    }
  }, [id, deviceType?.name]);

  const structure = deviceType?.definition?.structure || [];
  const sensors = structure.filter((s: any) => s.type !== 'mcu');
  const controls = deviceType?.card_template?.controls || [];
  const hasFirmware = !!deviceType?.firmware_code;
  const wiringImage = deviceType?.wiring_diagram_image || deviceType?.wiring_diagram_base64;
  const hasWiring = !!wiringImage;
  const hasDocs = !!deviceType?.documentation;

  // Build ReactFlow graph from device structure
  const { nodes: rfNodes, edges: rfEdges } = useMemo(
    () => reconstructGraph(structure),
    [structure],
  );

  // Generate personalized firmware code
  const personalizedCode = useMemo(() => {
    if (!deviceType?.firmware_code) return '';
    let code = deviceType.firmware_code;
    // Replace placeholders with user values
    code = code.replace(/\{\{WIFI_SSID\}\}/g, wifiSsid || '{{WIFI_SSID}}');
    code = code.replace(/\{\{WIFI_PASSWORD\}\}/g, wifiPassword || '{{WIFI_PASSWORD}}');
    code = code.replace(/\{\{SERVER_IP\}\}/g, serverIp || '{{SERVER_IP}}');
    // Also handle literal string assignments
    if (wifiSsid) {
      code = code.replace(/"{{WIFI_SSID}}"/g, `"${wifiSsid}"`);
    }
    if (wifiPassword) {
      code = code.replace(/"{{WIFI_PASSWORD}}"/g, `"${wifiPassword}"`);
    }
    if (serverIp) {
      code = code.replace(/"{{SERVER_IP}}"/g, `"${serverIp}"`);
    }
    return code;
  }, [deviceType?.firmware_code, wifiSsid, wifiPassword, serverIp]);

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success('Code copied to clipboard');
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleDownloadCode = (code: string, filename: string) => {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Code downloaded');
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 w-full max-w-5xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96" />
        <div className="grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (error || !deviceType) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <h3 className="text-lg font-semibold text-foreground">Device not found</h3>
        <p className="text-sm text-muted-foreground mt-1">This device type doesn&apos;t exist or you don&apos;t have access.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/dashboard/device-collection')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Collection
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 w-full max-w-5xl mx-auto space-y-6">
      {/* Back + Header */}
      <div>
        <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/device-collection')} className="-ml-2 text-muted-foreground hover:text-foreground mb-2">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Collection
        </Button>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{deviceType.name}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
              {deviceType.proposed_by_username && (
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5" />
                  {deviceType.proposed_by_username}
                </span>
              )}
              {deviceType.created_at && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(deviceType.created_at).toLocaleDateString()}
                </span>
              )}
              <Badge variant="outline" className="text-xs border-green-500/30 text-green-600 dark:text-green-400">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Approved
              </Badge>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" className="gap-2" onClick={handleExport}>
              <Download className="w-4 h-4" />
              Export
            </Button>
            {/* Deploy Button */}
            {hasFirmware && (
              <Dialog open={deployOpen} onOpenChange={setDeployOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2">
                    <Zap className="w-4 h-4" />
                    Use This Device
                  </Button>
                </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-primary" />
                    Deploy {deviceType.name}
                  </DialogTitle>
                  <DialogDescription>
                    Enter your network details. These will be injected into the firmware code for download.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  {REQUIRED_VARIABLES.map((v) => {
                    const Icon = v.icon;
                    const value = v.name === 'wifi_ssid' ? wifiSsid : v.name === 'wifi_password' ? wifiPassword : serverIp;
                    const setter = v.name === 'wifi_ssid' ? setWifiSsid : v.name === 'wifi_password' ? setWifiPassword : setServerIp;
                    return (
                      <div key={v.name} className="space-y-1.5">
                        <Label className="text-sm flex items-center gap-2">
                          <Icon className="w-4 h-4 text-muted-foreground" />
                          {v.label}
                        </Label>
                        <Input
                          value={value}
                          onChange={(e) => setter(e.target.value)}
                          placeholder={v.placeholder}
                          type={v.name === 'wifi_password' ? 'password' : 'text'}
                        />
                      </div>
                    );
                  })}
                </div>
                <DialogFooter className="flex-col sm:flex-row gap-2">
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => handleCopyCode(personalizedCode)}
                    disabled={!wifiSsid || !wifiPassword || !serverIp}
                  >
                    <Copy className="w-4 h-4" />
                    Copy Code
                  </Button>
                  <Button
                    className="gap-2"
                    onClick={() => handleDownloadCode(
                      personalizedCode,
                      `${deviceType.name.toLowerCase().replace(/\s+/g, '_')}.ino`
                    )}
                    disabled={!wifiSsid || !wifiPassword || !serverIp}
                  >
                    <Download className="w-4 h-4" />
                    Download .ino
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            )}
          </div>
        </div>
      </div>

      {/* Sensors Overview */}
      {sensors.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {sensors.map((sensor: any, i: number) => {
            const config = SENSOR_ICONS[sensor.type];
            if (!config) return null;
            const Icon = config.icon;
            return (
              <div
                key={i}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg border bg-card/50 text-sm',
                  config.color
                )}
              >
                <Icon className="w-4 h-4" />
                <span className="font-medium">{sensor.label}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4 min-w-0">
        <TabsList className="w-full">
          <TabsTrigger value="overview" className="gap-1.5 flex-1">
            <Info className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          {hasFirmware && (
            <TabsTrigger value="code" className="gap-1.5 flex-1">
              <Code2 className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Code</span>
            </TabsTrigger>
          )}
          {hasWiring && (
            <TabsTrigger value="wiring" className="gap-1.5 flex-1">
              <Cable className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Wiring</span>
            </TabsTrigger>
          )}
          {hasDocs && (
            <TabsTrigger value="docs" className="gap-1.5 flex-1">
              <BookOpen className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Docs</span>
            </TabsTrigger>
          )}
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Components Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-primary" />
                  Hardware Components
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {structure.map((component: any, i: number) => {
                  const config = SENSOR_ICONS[component.type];
                  const Icon = config?.icon || Cpu;
                  return (
                    <div key={i} className="flex items-center gap-3 py-1.5">
                      <Icon className={cn('w-4 h-4', config?.color || 'text-muted-foreground')} />
                      <span className="text-sm text-foreground">{component.label}</span>
                      <Badge variant="secondary" className="text-[10px] ml-auto">{component.type}</Badge>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Controls Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <ToggleLeft className="w-4 h-4 text-primary" />
                  UI Controls
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {controls.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No controls configured</p>
                ) : (
                  controls.map((control: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 py-1.5">
                      <span className="text-sm text-foreground">{control.label}</span>
                      <Badge variant="outline" className="text-[10px] ml-auto">{control.widget_type}</Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Content availability */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">What&apos;s Included</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className={cn(
                  'flex items-center gap-3 p-3 rounded-lg border',
                  hasFirmware ? 'border-green-500/20 bg-green-500/5' : 'border-border bg-muted/20 opacity-50'
                )}>
                  <Code2 className={cn('w-5 h-5', hasFirmware ? 'text-green-500' : 'text-muted-foreground')} />
                  <div>
                    <p className="text-sm font-medium text-foreground">Firmware Code</p>
                    <p className="text-xs text-muted-foreground">{hasFirmware ? 'Arduino/ESP32 ready' : 'Not provided'}</p>
                  </div>
                </div>
                <div className={cn(
                  'flex items-center gap-3 p-3 rounded-lg border',
                  hasWiring ? 'border-blue-500/20 bg-blue-500/5' : 'border-border bg-muted/20 opacity-50'
                )}>
                  <Cable className={cn('w-5 h-5', hasWiring ? 'text-blue-500' : 'text-muted-foreground')} />
                  <div>
                    <p className="text-sm font-medium text-foreground">Wiring Diagram</p>
                    <p className="text-xs text-muted-foreground">{hasWiring ? 'Instructions included' : 'Not provided'}</p>
                  </div>
                </div>
                <div className={cn(
                  'flex items-center gap-3 p-3 rounded-lg border',
                  hasDocs ? 'border-purple-500/20 bg-purple-500/5' : 'border-border bg-muted/20 opacity-50'
                )}>
                  <BookOpen className={cn('w-5 h-5', hasDocs ? 'text-purple-500' : 'text-muted-foreground')} />
                  <div>
                    <p className="text-sm font-medium text-foreground">Documentation</p>
                    <p className="text-xs text-muted-foreground">{hasDocs ? 'Full guide available' : 'Not provided'}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Hardware Topology & Wiring Diagram side-by-side */}
          {(structure.length > 0 || hasWiring) && (
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Node Topology */}
              {structure.length > 0 && (
                <div className="flex flex-col rounded-lg border overflow-hidden min-h-[300px]">
                  <div className="py-2 px-3 border-b bg-muted/30 shrink-0">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Hardware Topology</span>
                  </div>
                  <div
                    className="flex-1 relative [&_.react-flow__pane]:!bg-transparent [&_.react-flow__background]:!bg-transparent"
                    style={{ backgroundColor: 'hsl(var(--background))', minHeight: 280 }}
                  >
                    <ReactFlowProvider>
                      <ReactFlow
                        nodes={rfNodes}
                        edges={rfEdges}
                        nodeTypes={nodeTypes}
                        fitView
                        fitViewOptions={{ padding: 0.3 }}
                        proOptions={{ hideAttribution: true }}
                        nodesDraggable={false}
                        nodesConnectable={false}
                        elementsSelectable={false}
                        style={{ backgroundColor: 'hsl(var(--background))' }}
                      />
                    </ReactFlowProvider>
                  </div>
                </div>
              )}

              {/* Wiring Diagram Thumbnail */}
              {hasWiring && (
                <div className="flex flex-col rounded-lg border overflow-hidden min-h-[300px]">
                  <div className="py-2 px-3 border-b bg-muted/30 shrink-0">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Wiring Diagram</span>
                  </div>
                  <div className="flex-1 flex items-center justify-center p-3 bg-white dark:bg-muted/20">
                    <img
                      src={getMediaUrl(wiringImage)}
                      alt="Wiring diagram"
                      className="max-h-[280px] w-full object-contain"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* Code Tab */}
        {hasFirmware && (
          <TabsContent value="code" className="space-y-4 min-w-0">
            <Card className="w-full overflow-hidden">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-primary" />
                  Firmware Source Code
                </CardTitle>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon-sm" onClick={() => handleCopyCode(deviceType.firmware_code)}>
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => handleDownloadCode(
                    deviceType.firmware_code,
                    `${deviceType.name.toLowerCase().replace(/\s+/g, '_')}_template.ino`
                  )}>
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4 md:px-6 md:pb-6 pt-0">
                <style dangerouslySetInnerHTML={{ __html: `
                  .firmware-code { color: #383a42; }
                  .firmware-code .token.comment, .firmware-code .token.prolog, .firmware-code .token.doctype, .firmware-code .token.cdata { color: #a0a1a7; font-style: italic; }
                  .firmware-code .token.punctuation { color: #383a42; }
                  .firmware-code .token.property, .firmware-code .token.tag, .firmware-code .token.boolean, .firmware-code .token.number, .firmware-code .token.constant, .firmware-code .token.symbol { color: #986801; }
                  .firmware-code .token.selector, .firmware-code .token.string, .firmware-code .token.char, .firmware-code .token.builtin { color: #50a14f; }
                  .firmware-code .token.operator, .firmware-code .token.entity, .firmware-code .token.url { color: #0184bc; }
                  .firmware-code .token.atrule, .firmware-code .token.attr-value, .firmware-code .token.keyword { color: #a626a4; }
                  .firmware-code .token.function, .firmware-code .token.class-name { color: #4078f2; }
                  .firmware-code .token.regex, .firmware-code .token.important, .firmware-code .token.variable { color: #e45649; }
                  .firmware-code .token.macro, .firmware-code .token.directive { color: #a626a4; font-weight: 600; }
                  .dark .firmware-code { color: #c5c8c6; }
                  .dark .firmware-code .token.comment, .dark .firmware-code .token.prolog, .dark .firmware-code .token.doctype, .dark .firmware-code .token.cdata { color: #7f848e; font-style: italic; }
                  .dark .firmware-code .token.punctuation { color: #abb2bf; }
                  .dark .firmware-code .token.property, .dark .firmware-code .token.tag, .dark .firmware-code .token.boolean, .dark .firmware-code .token.number, .dark .firmware-code .token.constant, .dark .firmware-code .token.symbol { color: #d19a66; }
                  .dark .firmware-code .token.selector, .dark .firmware-code .token.string, .dark .firmware-code .token.char, .dark .firmware-code .token.builtin { color: #98c379; }
                  .dark .firmware-code .token.operator, .dark .firmware-code .token.entity, .dark .firmware-code .token.url { color: #56b6c2; }
                  .dark .firmware-code .token.atrule, .dark .firmware-code .token.attr-value, .dark .firmware-code .token.keyword { color: #c678dd; }
                  .dark .firmware-code .token.function, .dark .firmware-code .token.class-name { color: #61afef; }
                  .dark .firmware-code .token.regex, .dark .firmware-code .token.important, .dark .firmware-code .token.variable { color: #e06c75; }
                  .dark .firmware-code .token.macro, .dark .firmware-code .token.directive { color: #c678dd; font-weight: 600; }
                `}} />
                <div className="rounded-lg overflow-hidden border border-border bg-muted/30 dark:bg-[#1d1f21]">
                  <div className="flex items-center justify-between px-4 py-1.5 bg-muted/50 dark:bg-[#282a2e] border-b border-border text-xs text-muted-foreground">
                    <span>firmware.ino — C++ (Arduino)</span>
                    <span>{deviceType.firmware_code.split('\n').length} lines</span>
                  </div>
                  <div className="overflow-x-auto">
                    <pre className="p-4 firmware-code" style={{ fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace', fontSize: 14, lineHeight: 1.65 }}>
                      <code
                        dangerouslySetInnerHTML={{
                          __html: Prism.highlight(deviceType.firmware_code, Prism.languages.cpp, 'cpp'),
                        }}
                      />
                    </pre>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  This is the template code. Click <strong>&quot;Use This Device&quot;</strong> above to generate personalized code with your WiFi and server details.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Wiring Tab — image only */}
        {hasWiring && (
          <TabsContent value="wiring" className="space-y-4">
            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Cable className="w-4 h-4 text-primary" />
                  Wiring Diagram
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border border-border overflow-hidden bg-white dark:bg-muted/20">
                  <img
                    src={getMediaUrl(wiringImage)}
                    alt="Wiring diagram"
                    className="w-full max-h-[700px] object-contain p-4"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Documentation Tab */}
        {hasDocs && (
          <TabsContent value="docs" className="space-y-4">
            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-primary" />
                  Documentation
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 md:p-8">
                <MarkdownRenderer>{deviceType.documentation}</MarkdownRenderer>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
