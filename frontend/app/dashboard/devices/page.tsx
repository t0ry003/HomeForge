"use client"

import { useState, useEffect } from "react"
import { Plus, Pencil, Trash2, Wifi, WifiOff, Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { fetchDevices, createDevice, updateDevice, deleteDevice, fetchRooms, fetchDeviceTypes } from "@/lib/apiClient"
import { toast } from "sonner"

interface Device {
  id: number
  name: string
  ip_address: string
  status: string
  device_type: number
  device_type_info: {
    id: number
    name: string
    description: string
    schema: {
      sensors?: string[]
      actions?: string[]
    }
  }
  custom_data: Record<string, any>
  room: number | null
  room_name: string | null
}

interface Room {
  id: number
  name: string
}

interface DeviceType {
  id: number
  name: string
  description: string
  schema: {
    sensors?: string[]
    actions?: string[]
  }
}

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [deviceTypes, setDeviceTypes] = useState<DeviceType[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingDevice, setEditingDevice] = useState<Device | null>(null)

  const [name, setName] = useState("")
  const [ipAddress, setIpAddress] = useState("")
  const [deviceTypeId, setDeviceTypeId] = useState<string>("")
  const [roomId, setRoomId] = useState<string>("")

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [devicesData, roomsData, typesData] = await Promise.all([
        fetchDevices(),
        fetchRooms(),
        fetchDeviceTypes()
      ])
      setDevices(devicesData)
      setRooms(roomsData)
      setDeviceTypes(typesData)
    } catch (error) {
      toast.error("Failed to load data")
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setName("")
    setIpAddress("")
    setDeviceTypeId("")
    setRoomId("")
  }

  const handleAddDevice = async () => {
    if (!name.trim() || !ipAddress.trim() || !deviceTypeId) {
      toast.error("Name, IP address, and device type are required")
      return
    }

    try {
      await createDevice({
        name,
        ip_address: ipAddress,
        device_type: parseInt(deviceTypeId),
        room: roomId ? parseInt(roomId) : null,
        custom_data: {}
      })
      toast.success("Device created successfully")
      resetForm()
      setIsAddDialogOpen(false)
      loadData()
    } catch (error) {
      toast.error("Failed to create device")
    }
  }

  const handleEditDevice = async () => {
    if (!editingDevice || !name.trim() || !ipAddress.trim() || !deviceTypeId) {
      toast.error("Name, IP address, and device type are required")
      return
    }

    try {
      await updateDevice(editingDevice.id, {
        name,
        ip_address: ipAddress,
        device_type: parseInt(deviceTypeId),
        room: roomId ? parseInt(roomId) : null,
        custom_data: editingDevice.custom_data
      })
      toast.success("Device updated successfully")
      resetForm()
      setEditingDevice(null)
      setIsEditDialogOpen(false)
      loadData()
    } catch (error) {
      toast.error("Failed to update device")
    }
  }

  const handleDeleteDevice = async (id: number) => {
    if (!confirm("Are you sure you want to delete this device?")) return

    try {
      await deleteDevice(id)
      toast.success("Device deleted successfully")
      loadData()
    } catch (error) {
      toast.error("Failed to delete device")
    }
  }

  const openEditDialog = (device: Device) => {
    setEditingDevice(device)
    setName(device.name)
    setIpAddress(device.ip_address)
    setDeviceTypeId(device.device_type.toString())
    setRoomId(device.room ? device.room.toString() : "")
    setIsEditDialogOpen(true)
  }

  const groupDevicesByRoom = () => {
    const grouped: Record<string, Device[]> = {}
    
    devices.forEach(device => {
      const roomName = device.room_name || "Unassigned"
      if (!grouped[roomName]) {
        grouped[roomName] = []
      }
      grouped[roomName].push(device)
    })
    
    return grouped
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading devices...</div>
      </div>
    )
  }

  const groupedDevices = groupDevicesByRoom()

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Devices</h1>
          <p className="text-muted-foreground">
            Manage your smart home devices organized by room
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Device
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Device</DialogTitle>
              <DialogDescription>
                Configure a new device in your smart home
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <label htmlFor="device-name" className="text-sm font-medium">
                  Device Name
                </label>
                <Input
                  id="device-name"
                  placeholder="e.g., Living Room Thermostat"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="device-ip" className="text-sm font-medium">
                  IP Address
                </label>
                <Input
                  id="device-ip"
                  placeholder="e.g., 192.168.1.100"
                  value={ipAddress}
                  onChange={(e) => setIpAddress(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="device-type" className="text-sm font-medium">
                  Device Type
                </label>
                <Select value={deviceTypeId} onValueChange={setDeviceTypeId}>
                  <SelectTrigger id="device-type">
                    <SelectValue placeholder="Select device type" />
                  </SelectTrigger>
                  <SelectContent>
                    {deviceTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id.toString()}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <label htmlFor="device-room" className="text-sm font-medium">
                  Room (Optional)
                </label>
                <Select value={roomId} onValueChange={setRoomId}>
                  <SelectTrigger id="device-room">
                    <SelectValue placeholder="Select room" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No Room</SelectItem>
                    {rooms.map((room) => (
                      <SelectItem key={room.id} value={room.id.toString()}>
                        {room.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setIsAddDialogOpen(false); resetForm(); }}>
                Cancel
              </Button>
              <Button onClick={handleAddDevice}>Create Device</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {devices.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Home className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No devices yet</h3>
              <p className="text-muted-foreground mb-4">
                Get started by adding your first device
              </p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Device
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {Object.entries(groupedDevices).map(([roomName, roomDevices]) => (
            <Card key={roomName}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Home className="h-5 w-5" />
                  {roomName}
                </CardTitle>
                <CardDescription>
                  {roomDevices.length} {roomDevices.length === 1 ? "device" : "devices"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {roomDevices.map((device) => (
                    <Card key={device.id} className="relative">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-base">{device.name}</CardTitle>
                            <CardDescription className="text-xs mt-1">
                              {device.device_type_info.name}
                            </CardDescription>
                          </div>
                          <Badge 
                            variant={device.status === "online" ? "default" : "secondary"}
                            className="ml-2"
                          >
                            {device.status === "online" ? (
                              <Wifi className="h-3 w-3 mr-1" />
                            ) : (
                              <WifiOff className="h-3 w-3 mr-1" />
                            )}
                            {device.status}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="text-sm">
                          <div className="text-muted-foreground">IP Address</div>
                          <div className="font-mono text-xs">{device.ip_address}</div>
                        </div>
                        
                        {device.device_type_info.schema.sensors && device.device_type_info.schema.sensors.length > 0 && (
                          <div className="text-sm">
                            <div className="text-muted-foreground mb-1">Sensors</div>
                            <div className="flex flex-wrap gap-1">
                              {device.device_type_info.schema.sensors.map((sensor, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {sensor}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <div className="flex gap-2 pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => openEditDialog(device)}
                          >
                            <Pencil className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteDevice(device.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Device</DialogTitle>
            <DialogDescription>
              Update device information
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="edit-device-name" className="text-sm font-medium">
                Device Name
              </label>
              <Input
                id="edit-device-name"
                placeholder="e.g., Living Room Thermostat"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="edit-device-ip" className="text-sm font-medium">
                IP Address
              </label>
              <Input
                id="edit-device-ip"
                placeholder="e.g., 192.168.1.100"
                value={ipAddress}
                onChange={(e) => setIpAddress(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="edit-device-type" className="text-sm font-medium">
                Device Type
              </label>
              <Select value={deviceTypeId} onValueChange={setDeviceTypeId}>
                <SelectTrigger id="edit-device-type">
                  <SelectValue placeholder="Select device type" />
                </SelectTrigger>
                <SelectContent>
                  {deviceTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id.toString()}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <label htmlFor="edit-device-room" className="text-sm font-medium">
                Room (Optional)
              </label>
              <Select value={roomId} onValueChange={setRoomId}>
                <SelectTrigger id="edit-device-room">
                  <SelectValue placeholder="Select room" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No Room</SelectItem>
                  {rooms.map((room) => (
                    <SelectItem key={room.id} value={room.id.toString()}>
                      {room.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsEditDialogOpen(false); resetForm(); setEditingDevice(null); }}>
              Cancel
            </Button>
            <Button onClick={handleEditDevice}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
