"use client"

import { useState, useCallback } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
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
import { Skeleton } from "@/components/ui/skeleton"
import { fetchRooms, createRoom, updateRoom, deleteRoom } from "@/lib/apiClient"

export default function RoomsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingRoom, setEditingRoom] = useState<any>(null)
  const [roomToDelete, setRoomToDelete] = useState<number | null>(null)
  const [name, setName] = useState("")
  const queryClient = useQueryClient()

  // Fetch rooms with React Query
  const { data: rooms = [], isLoading } = useQuery({
    queryKey: ['rooms'],
    queryFn: async () => {
      const data = await fetchRooms()
      return Array.isArray(data) ? data : (data.results || [])
    },
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
  })

  // Create room mutation
  const createMutation = useMutation({
    mutationFn: (payload: { name: string }) => createRoom(payload),
    onSuccess: () => {
      toast.success("Room created")
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
      setIsDialogOpen(false)
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create room")
    },
  })

  // Update room mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: { name: string } }) => 
      updateRoom(id, payload),
    onSuccess: () => {
      toast.success("Room updated")
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
      setIsDialogOpen(false)
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update room")
    },
  })

  // Delete room mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteRoom(id),
    onSuccess: () => {
      toast.success("Room deleted")
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
      setRoomToDelete(null)
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete room")
      setRoomToDelete(null)
    },
  })

  const handleOpenDialog = useCallback((room: any = null) => {
    if (room) {
      setEditingRoom(room)
      setName(room.name)
    } else {
      setEditingRoom(null)
      setName("")
    }
    setIsDialogOpen(true)
  }, [])

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    const payload = { name }
    if (editingRoom) {
      updateMutation.mutate({ id: editingRoom.id, payload })
    } else {
      createMutation.mutate(payload)
    }
  }, [name, editingRoom, updateMutation, createMutation])

  const confirmDelete = useCallback(() => {
    if (roomToDelete) {
      deleteMutation.mutate(roomToDelete)
    }
  }, [roomToDelete, deleteMutation])

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
              // Skeleton rows for loading state
              <>
                {[1, 2, 3].map((i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Skeleton className="h-8 w-8" />
                        <Skeleton className="h-8 w-8" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </>
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
