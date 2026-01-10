"use client"

import { useEffect, useState } from "react"
import { MoreHorizontal, Shield, User as UserIcon, Eye, Check } from "lucide-react"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { fetchUsers, updateUserAdmin, deleteUser } from "@/lib/apiClient"

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [userToDelete, setUserToDelete] = useState<number | null>(null)

  const loadUsers = async () => {
    try {
      setIsLoading(true)
      const data = await fetchUsers()
      setUsers(Array.isArray(data) ? data : (data.results || []))
    } catch (error: any) {
      toast.error(error.message || "Failed to load users")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const handleRoleChange = async (userId: number, newRole: string) => {
    try {
      await updateUserAdmin(userId, { role: newRole })
      toast.success(`User role updated to ${newRole}`)
      loadUsers()
    } catch (error: any) {
      toast.error(error.message || "Failed to update role")
    }
  }

  const confirmDelete = async () => {
    if (!userToDelete) return
    try {
        await deleteUser(userToDelete)
        toast.success("User deleted")
        loadUsers()
    } catch (error: any) {
        toast.error(error.message || "Failed to delete user")
    } finally {
        setUserToDelete(null)
    }
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'owner':
        return <Badge className="bg-purple-500/10 text-purple-500 border-purple-500/20">Owner</Badge>
      case 'admin':
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Admin</Badge>
      case 'user':
        return <Badge variant="outline">User</Badge>
      case 'viewer':
        return <Badge variant="secondary">Viewer</Badge>
      default:
        return <Badge variant="outline">{role}</Badge>
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Users</h2>
          <p className="text-muted-foreground">
            Manage user access and roles.
          </p>
        </div>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Username</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Full Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.username}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.first_name} {user.last_name}</TableCell>
                  <TableCell>{getRoleBadge(user.profile?.role || user.role)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger>
                            <Shield className="mr-2 h-4 w-4" />
                            <span>Change Role</span>
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent>
                             <DropdownMenuItem onClick={() => handleRoleChange(user.id, 'admin')}>
                               Admin
                             </DropdownMenuItem>
                             <DropdownMenuItem onClick={() => handleRoleChange(user.id, 'user')}>
                               User
                             </DropdownMenuItem>
                             <DropdownMenuItem onClick={() => handleRoleChange(user.id, 'viewer')}>
                               Viewer
                             </DropdownMenuItem>
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setUserToDelete(user.id)}>
                          Delete User
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

       <Dialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Delete User</DialogTitle>
                <DialogDescription>
                    Are you sure you want to delete this user? This action cannot be undone.
                </DialogDescription>
            </DialogHeader>
            <DialogFooter>
                <Button variant="outline" onClick={() => setUserToDelete(null)}>Cancel</Button>
                <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
