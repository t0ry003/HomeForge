"use client"

import { useEffect, useState } from "react"
import { Plus, Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { fetchRooms, createRoom, updateRoom, deleteRoom } from "@/lib/apiClient"

export default function RoomsPage() {
  const [rooms, setRooms] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingRoom, setEditingRoom] = useState<any>(null)
  const [roomToDelete, setRoomToDelete] = useState<number | null>(null)
  
  // Form State
  const [name, setName] = useState("")

  const loadRooms = async () => {
    try {
      setIsLoading(true)
      const data = await fetchRooms()
      setRooms(Array.isArray(data) ? data : (data.results || []))
    } catch (error: any) {
      toast.error(error.message || "Failed to load rooms")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadRooms()
  }, [])

  const handleOpenDialog = (room: any = null) => {
    if (room) {
      setEditingRoom(room)
      setName(room.name)
    } else {
      setEditingRoom(null)
      setName("")
    }
    setIsDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const payload = { name }
      if (editingRoom) {
        await updateRoom(editingRoom.id, payload)
        toast.success("Room updated")
      } else {
        await createRoom(payload)
        toast.success("Room created")
      }
      setIsDialogOpen(false)
      loadRooms()
    } catch (error: any) {
      toast.error(error.message || (editingRoom ? "Failed to update room" : "Failed to create room"))
    }
  }

  const confirmDelete = async () => {
    if (!roomToDelete) return
    try {
      await deleteRoom(roomToDelete)
      toast.success("Room deleted")
      loadRooms()
    } catch (error: any) {
      toast.error(error.message || "Failed to delete room")
    } finally {
      setRoomToDelete(null)
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Rooms</h2>
          <p className="text-sm text-muted-foreground">
            Manage your home's rooms and zones.
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" /> Add Room
        </Button>
      </div>

      <div className="rounded-md border bg-card overflow-x-auto">
        <Table className="min-w-[300px]">
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="w-[100px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={2} className="h-24 text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : rooms.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} className="h-24 text-center">
                  No rooms found.
                </TableCell>
              </TableRow>
            ) : (
              rooms.map((room) => (
                <TableRow key={room.id}>
                  <TableCell className="font-medium">{room.name}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                       <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(room)}>
                         <Pencil className="h-4 w-4" />
                       </Button>
                       <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setRoomToDelete(room.id)}>
                         <Trash2 className="h-4 w-4" />
                       </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit/Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRoom ? "Edit Room" : "Add Room"}</DialogTitle>
            <DialogDescription>
              {editingRoom ? "Make changes to the room details here." : "Add a new room to your home."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Living Room"
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">{editingRoom ? "Save Changes" : "Create Room"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!roomToDelete} onOpenChange={(open) => !open && setRoomToDelete(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Delete Room</DialogTitle>
                <DialogDescription>
                    Are you sure you want to delete this room? This action cannot be undone.
                </DialogDescription>
            </DialogHeader>
            <DialogFooter>
                <Button variant="outline" onClick={() => setRoomToDelete(null)}>Cancel</Button>
                <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
