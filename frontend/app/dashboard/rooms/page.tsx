"use client"

import { useState, useEffect } from "react"
import { Plus, Pencil, Trash2, Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { fetchRooms, createRoom, updateRoom, deleteRoom } from "@/lib/apiClient"
import { toast } from "sonner"

interface Room {
  id: number
  name: string
}

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingRoom, setEditingRoom] = useState<Room | null>(null)
  const [roomName, setRoomName] = useState("")

  useEffect(() => {
    loadRooms()
  }, [])

  const loadRooms = async () => {
    try {
      const data = await fetchRooms()
      setRooms(data)
    } catch (error) {
      toast.error("Failed to load rooms")
    } finally {
      setLoading(false)
    }
  }

  const handleAddRoom = async () => {
    if (!roomName.trim()) {
      toast.error("Room name is required")
      return
    }

    try {
      await createRoom({ name: roomName })
      toast.success("Room created successfully")
      setRoomName("")
      setIsAddDialogOpen(false)
      loadRooms()
    } catch (error) {
      toast.error("Failed to create room")
    }
  }

  const handleEditRoom = async () => {
    if (!editingRoom || !roomName.trim()) {
      toast.error("Room name is required")
      return
    }

    try {
      await updateRoom(editingRoom.id, { name: roomName })
      toast.success("Room updated successfully")
      setRoomName("")
      setEditingRoom(null)
      setIsEditDialogOpen(false)
      loadRooms()
    } catch (error) {
      toast.error("Failed to update room")
    }
  }

  const handleDeleteRoom = async (id: number) => {
    if (!confirm("Are you sure you want to delete this room?")) return

    try {
      await deleteRoom(id)
      toast.success("Room deleted successfully")
      loadRooms()
    } catch (error) {
      toast.error("Failed to delete room")
    }
  }

  const openEditDialog = (room: Room) => {
    setEditingRoom(room)
    setRoomName(room.name)
    setIsEditDialogOpen(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading rooms...</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Rooms</h1>
          <p className="text-muted-foreground">
            Manage your home rooms and spaces
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Room
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Room</DialogTitle>
              <DialogDescription>
                Create a new room to organize your devices
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <label htmlFor="room-name" className="text-sm font-medium">
                  Room Name
                </label>
                <Input
                  id="room-name"
                  placeholder="e.g., Living Room"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddRoom}>Create Room</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Rooms</CardTitle>
          <CardDescription>
            {rooms.length} {rooms.length === 1 ? "room" : "rooms"} configured
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rooms.length === 0 ? (
            <div className="text-center py-12">
              <Home className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No rooms yet</h3>
              <p className="text-muted-foreground mb-4">
                Get started by creating your first room
              </p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Room
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rooms.map((room) => (
                  <TableRow key={room.id}>
                    <TableCell className="font-medium">{room.name}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(room)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteRoom(room.id)}
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Room</DialogTitle>
            <DialogDescription>
              Update the room name
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="edit-room-name" className="text-sm font-medium">
                Room Name
              </label>
              <Input
                id="edit-room-name"
                placeholder="e.g., Living Room"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditRoom}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
