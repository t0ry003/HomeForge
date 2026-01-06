"use client"

import { useState, useEffect } from "react"
import { Plus, Pencil, Trash2, Cpu, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { fetchDeviceTypes, createDeviceType, updateDeviceType, deleteDeviceType } from "@/lib/apiClient"
import { toast } from "sonner"

interface DeviceType {
  id: number
  name: string
  description: string
  schema: {
    sensors?: string[]
    actions?: string[]
  }
}

export default function DeviceTypesPage() {
  const [deviceTypes, setDeviceTypes] = useState<DeviceType[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingType, setEditingType] = useState<DeviceType | null>(null)
  
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [sensors, setSensors] = useState("")
  const [actions, setActions] = useState("")

  useEffect(() => {
    loadDeviceTypes()
  }, [])

  const loadDeviceTypes = async () => {
    try {
      const data = await fetchDeviceTypes()
      setDeviceTypes(data)
    } catch (error) {
      toast.error("Failed to load device types")
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setName("")
    setDescription("")
    setSensors("")
    setActions("")
  }

  const handleAddDeviceType = async () => {
    if (!name.trim()) {
      toast.error("Device type name is required")
      return
    }

    const schema = {
      sensors: sensors.split(",").map(s => s.trim()).filter(Boolean),
      actions: actions.split(",").map(a => a.trim()).filter(Boolean)
    }

    try {
      await createDeviceType({ name, description, schema })
      toast.success("Device type created successfully")
      resetForm()
      setIsAddDialogOpen(false)
      loadDeviceTypes()
    } catch (error) {
      toast.error("Failed to create device type")
    }
  }

  const handleEditDeviceType = async () => {
    if (!editingType || !name.trim()) {
      toast.error("Device type name is required")
      return
    }

    const schema = {
      sensors: sensors.split(",").map(s => s.trim()).filter(Boolean),
      actions: actions.split(",").map(a => a.trim()).filter(Boolean)
    }

    try {
      await updateDeviceType(editingType.id, { name, description, schema })
      toast.success("Device type updated successfully")
      resetForm()
      setEditingType(null)
      setIsEditDialogOpen(false)
      loadDeviceTypes()
    } catch (error) {
      toast.error("Failed to update device type")
    }
  }

  const handleDeleteDeviceType = async (id: number) => {
    if (!confirm("Are you sure you want to delete this device type? Devices using this type may be affected.")) return

    try {
      await deleteDeviceType(id)
      toast.success("Device type deleted successfully")
      loadDeviceTypes()
    } catch (error) {
      toast.error("Failed to delete device type")
    }
  }

  const openEditDialog = (type: DeviceType) => {
    setEditingType(type)
    setName(type.name)
    setDescription(type.description)
    setSensors((type.schema.sensors || []).join(", "))
    setActions((type.schema.actions || []).join(", "))
    setIsEditDialogOpen(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading device types...</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Device Types</h1>
          <p className="text-muted-foreground">
            Define device types with their sensors and actions
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Device Type
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Device Type</DialogTitle>
              <DialogDescription>
                Define a new device type with its schema
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <label htmlFor="type-name" className="text-sm font-medium">
                  Name
                </label>
                <Input
                  id="type-name"
                  placeholder="e.g., Thermostat"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="type-description" className="text-sm font-medium">
                  Description
                </label>
                <Input
                  id="type-description"
                  placeholder="e.g., Smart thermostat for temperature control"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="type-sensors" className="text-sm font-medium">
                  Sensors (comma-separated)
                </label>
                <Input
                  id="type-sensors"
                  placeholder="e.g., temperature, humidity"
                  value={sensors}
                  onChange={(e) => setSensors(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="type-actions" className="text-sm font-medium">
                  Actions (comma-separated)
                </label>
                <Input
                  id="type-actions"
                  placeholder="e.g., set_temp, set_mode"
                  value={actions}
                  onChange={(e) => setActions(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setIsAddDialogOpen(false); resetForm(); }}>
                Cancel
              </Button>
              <Button onClick={handleAddDeviceType}>Create Device Type</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Device Types</CardTitle>
          <CardDescription>
            {deviceTypes.length} {deviceTypes.length === 1 ? "type" : "types"} configured
          </CardDescription>
        </CardHeader>
        <CardContent>
          {deviceTypes.length === 0 ? (
            <div className="text-center py-12">
              <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No device types yet</h3>
              <p className="text-muted-foreground mb-4">
                Get started by defining your first device type
              </p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Device Type
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Sensors</TableHead>
                  <TableHead>Actions</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deviceTypes.map((type) => (
                  <TableRow key={type.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Cpu className="h-4 w-4 text-muted-foreground" />
                        {type.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {type.description || "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(type.schema.sensors || []).map((sensor, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {sensor}
                          </Badge>
                        ))}
                        {(!type.schema.sensors || type.schema.sensors.length === 0) && (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(type.schema.actions || []).map((action, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {action}
                          </Badge>
                        ))}
                        {(!type.schema.actions || type.schema.actions.length === 0) && (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(type)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteDeviceType(type.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Device Type</DialogTitle>
            <DialogDescription>
              Update the device type schema
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="edit-type-name" className="text-sm font-medium">
                Name
              </label>
              <Input
                id="edit-type-name"
                placeholder="e.g., Thermostat"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="edit-type-description" className="text-sm font-medium">
                Description
              </label>
              <Input
                id="edit-type-description"
                placeholder="e.g., Smart thermostat for temperature control"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="edit-type-sensors" className="text-sm font-medium">
                Sensors (comma-separated)
              </label>
              <Input
                id="edit-type-sensors"
                placeholder="e.g., temperature, humidity"
                value={sensors}
                onChange={(e) => setSensors(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="edit-type-actions" className="text-sm font-medium">
                Actions (comma-separated)
              </label>
              <Input
                id="edit-type-actions"
                placeholder="e.g., set_temp, set_mode"
                value={actions}
                onChange={(e) => setActions(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsEditDialogOpen(false); resetForm(); setEditingType(null); }}>
              Cancel
            </Button>
            <Button onClick={handleEditDeviceType}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
