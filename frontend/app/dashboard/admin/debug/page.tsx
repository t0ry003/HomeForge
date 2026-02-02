"use client"

import { useEffect, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { 
  Bug, 
  RefreshCw, 
  Wifi, 
  WifiOff, 
  Save, 
  Trash2, 
  ChevronDown,
  ChevronUp,
  Power,
  Zap,
  AlertTriangle
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { fetchDevices, updateDevice, updateDeviceState, deleteDevice } from "@/lib/apiClient"

interface Device {
  id: number
  name: string
  ip_address: string
  status: 'online' | 'offline' | 'error'
  icon: string
  device_type: number
  device_type_name: string
  room: number | null
  room_name: string | null
  current_state: Record<string, any>
}

function DeviceDebugCard({ device, onRefresh }: { device: Device; onRefresh: () => void }) {
  const [isOpen, setIsOpen] = useState(false)
  const [status, setStatus] = useState(device.status)
  const [stateJson, setStateJson] = useState(JSON.stringify(device.current_state || {}, null, 2))
  const [isJsonValid, setIsJsonValid] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const queryClient = useQueryClient()

  // Sync local state when device prop changes
  useEffect(() => {
    setStatus(device.status)
    setStateJson(JSON.stringify(device.current_state || {}, null, 2))
  }, [device])

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<Device>) => {
      return updateDevice(device.id, data)
    },
    onSuccess: async () => {
      toast.success(`Device "${device.name}" updated`)
      await queryClient.invalidateQueries({ queryKey: ['devices'] })
      onRefresh()
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update device')
    }
  })

  const stateMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      return updateDeviceState(device.id, data)
    },
    onSuccess: async () => {
      toast.success(`Device state updated`)
      await queryClient.invalidateQueries({ queryKey: ['devices'] })
      onRefresh()
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update state')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return deleteDevice(device.id)
    },
    onSuccess: async () => {
      toast.success(`Device "${device.name}" deleted`)
      await queryClient.invalidateQueries({ queryKey: ['devices'] })
      onRefresh()
      setDeleteDialogOpen(false)
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete device')
    }
  })

  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus as Device['status'])
  }

  const handleSaveStatus = () => {
    updateMutation.mutate({ status })
  }

  const handleJsonChange = (value: string) => {
    setStateJson(value)
    try {
      JSON.parse(value)
      setIsJsonValid(true)
    } catch {
      setIsJsonValid(false)
    }
  }

  const handleSaveState = () => {
    if (!isJsonValid) {
      toast.error('Invalid JSON')
      return
    }
    try {
      const parsed = JSON.parse(stateJson)
      stateMutation.mutate(parsed)
    } catch {
      toast.error('Invalid JSON')
    }
  }

  const setAllTogglesOn = () => {
    try {
      const current = JSON.parse(stateJson)
      const updated = { ...current }
      Object.keys(updated).forEach(key => {
        if (typeof updated[key] === 'boolean') {
          updated[key] = true
        }
      })
      setStateJson(JSON.stringify(updated, null, 2))
      stateMutation.mutate(updated)
    } catch {
      toast.error('Failed to parse current state')
    }
  }

  const setAllTogglesOff = () => {
    try {
      const current = JSON.parse(stateJson)
      const updated = { ...current }
      Object.keys(updated).forEach(key => {
        if (typeof updated[key] === 'boolean') {
          updated[key] = false
        }
      })
      setStateJson(JSON.stringify(updated, null, 2))
      stateMutation.mutate(updated)
    } catch {
      toast.error('Failed to parse current state')
    }
  }

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card className={`transition-all ${isOpen ? 'ring-2 ring-primary/50' : ''}`}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`h-3 w-3 rounded-full ${
                    device.status === 'online' ? 'bg-green-500' : 
                    device.status === 'error' ? 'bg-amber-500' : 'bg-zinc-400'
                  }`} />
                  <div>
                    <CardTitle className="text-base">{device.name}</CardTitle>
                    <CardDescription className="text-xs">
                      {device.device_type_name} • {device.room_name || 'No Room'} • {device.ip_address}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">ID: {device.id}</Badge>
                  {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <CardContent className="space-y-6 border-t pt-4">
              {/* Status Control */}
              <div className="space-y-3">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Wifi className="h-4 w-4" />
                  Device Status
                </Label>
                <div className="flex items-center gap-3">
                  <Select value={status} onValueChange={handleStatusChange}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="online">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-green-500" />
                          Online
                        </div>
                      </SelectItem>
                      <SelectItem value="offline">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-zinc-400" />
                          Offline
                        </div>
                      </SelectItem>
                      <SelectItem value="error">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-amber-500" />
                          Error
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Button 
                    size="sm" 
                    onClick={handleSaveStatus}
                    disabled={status === device.status || updateMutation.isPending}
                  >
                    <Save className="h-4 w-4 mr-1" />
                    Save Status
                  </Button>
                </div>
                
                {/* Quick Status Buttons */}
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="border-green-500/50 hover:bg-green-500/10 hover:text-green-600"
                    onClick={() => { setStatus('online'); updateMutation.mutate({ status: 'online' }); }}
                    disabled={updateMutation.isPending}
                  >
                    <Wifi className="h-4 w-4 mr-1" />
                    Set Online
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="border-zinc-500/50 hover:bg-zinc-500/10"
                    onClick={() => { setStatus('offline'); updateMutation.mutate({ status: 'offline' }); }}
                    disabled={updateMutation.isPending}
                  >
                    <WifiOff className="h-4 w-4 mr-1" />
                    Set Offline
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="border-amber-500/50 hover:bg-amber-500/10 hover:text-amber-600"
                    onClick={() => { setStatus('error'); updateMutation.mutate({ status: 'error' }); }}
                    disabled={updateMutation.isPending}
                  >
                    <AlertTriangle className="h-4 w-4 mr-1" />
                    Set Error
                  </Button>
                </div>
              </div>

              {/* Current State Editor */}
              <div className="space-y-3">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Current State (JSON)
                </Label>
                <Textarea
                  value={stateJson}
                  onChange={(e) => handleJsonChange(e.target.value)}
                  className={`font-mono text-xs min-h-[120px] ${!isJsonValid ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                  placeholder='{"relay_1": true, "brightness": 75}'
                />
                {!isJsonValid && (
                  <p className="text-xs text-red-500">Invalid JSON format</p>
                )}
                
                <div className="flex flex-wrap gap-2">
                  <Button 
                    size="sm" 
                    onClick={handleSaveState}
                    disabled={!isJsonValid || stateMutation.isPending}
                  >
                    <Save className="h-4 w-4 mr-1" />
                    Save State
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="border-green-500/50 hover:bg-green-500/10"
                    onClick={setAllTogglesOn}
                    disabled={stateMutation.isPending}
                  >
                    <Power className="h-4 w-4 mr-1" />
                    All Toggles ON
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={setAllTogglesOff}
                    disabled={stateMutation.isPending}
                  >
                    <Power className="h-4 w-4 mr-1" />
                    All Toggles OFF
                  </Button>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="pt-4 border-t border-destructive/20">
                <Button 
                  size="sm" 
                  variant="destructive"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete Device
                </Button>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Device</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{device.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default function DebugPage() {
  const queryClient = useQueryClient()
  
  const { data: devices, isLoading, error, refetch } = useQuery({
    queryKey: ['devices'],
    queryFn: fetchDevices,
  })

  const deviceList = Array.isArray(devices) ? devices : (devices?.results || [])

  const setAllOnline = async () => {
    for (const device of deviceList) {
      try {
        await updateDevice(device.id, { status: 'online' })
      } catch (e) {
        console.error(e)
      }
    }
    toast.success('All devices set to online')
    await queryClient.invalidateQueries({ queryKey: ['devices'] })
    refetch()
  }

  const setAllOffline = async () => {
    for (const device of deviceList) {
      try {
        await updateDevice(device.id, { status: 'offline' })
      } catch (e) {
        console.error(e)
      }
    }
    toast.success('All devices set to offline')
    await queryClient.invalidateQueries({ queryKey: ['devices'] })
    refetch()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
            <Bug className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Debug Dashboard</h2>
            <p className="text-muted-foreground text-sm">
              Test device states and UI behavior
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Warning Banner */}
      <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-amber-600 dark:text-amber-400">Development Tool</p>
          <p className="text-sm text-muted-foreground">
            This page directly modifies device data in the database. Use for testing only.
          </p>
        </div>
      </div>

      {/* Bulk Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bulk Actions</CardTitle>
          <CardDescription>Apply changes to all devices at once</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button variant="outline" className="border-green-500/50 hover:bg-green-500/10" onClick={setAllOnline}>
            <Wifi className="h-4 w-4 mr-2" />
            Set All Online
          </Button>
          <Button variant="outline" onClick={setAllOffline}>
            <WifiOff className="h-4 w-4 mr-2" />
            Set All Offline
          </Button>
        </CardContent>
      </Card>

      {/* Device List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">
          Devices ({deviceList.length})
        </h3>
        
        {isLoading ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Loading devices...
            </CardContent>
          </Card>
        ) : error ? (
          <Card>
            <CardContent className="py-8 text-center text-red-500">
              Failed to load devices
            </CardContent>
          </Card>
        ) : deviceList.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No devices found. Register some devices first.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {deviceList.map((device: Device) => (
              <DeviceDebugCard 
                key={device.id} 
                device={device} 
                onRefresh={refetch}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
