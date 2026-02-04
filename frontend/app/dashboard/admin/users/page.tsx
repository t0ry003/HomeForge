"use client"

import { useState, useCallback, useEffect, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { MoreHorizontal, Shield, User as UserIcon, Eye, Check, Search, X } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { Skeleton } from "@/components/ui/skeleton"
import { fetchUsers, updateUserAdmin, deleteUser, getAvatarUrl } from "@/lib/apiClient"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"

export default function UsersPage() {
  const searchParams = useSearchParams()
  const [userToDelete, setUserToDelete] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [highlightedUserId, setHighlightedUserId] = useState<number | null>(null)
  const queryClient = useQueryClient()

  // Get user ID from URL params for highlighting
  useEffect(() => {
    const userId = searchParams.get('user')
    const username = searchParams.get('username')
    if (userId) {
      setHighlightedUserId(parseInt(userId))
      // Clear highlight after 3 seconds
      setTimeout(() => setHighlightedUserId(null), 3000)
    } else if (username) {
      setSearchQuery(username)
    }
  }, [searchParams])

  // Fetch users with React Query
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const data = await fetchUsers()
      return Array.isArray(data) ? data : (data.results || [])
    },
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
  })

  // Filter users based on search and role
  const filteredUsers = useMemo(() => {
    return users.filter((user: any) => {
      const matchesSearch = searchQuery === "" || 
        user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchQuery.toLowerCase())
      
      const userRole = user.profile?.role || user.role || 'user'
      const matchesRole = roleFilter === "all" || userRole === roleFilter
      
      return matchesSearch && matchesRole
    })
  }, [users, searchQuery, roleFilter])

  // Role change mutation
  const roleChangeMutation = useMutation({
    mutationFn: ({ userId, newRole }: { userId: number; newRole: string }) => 
      updateUserAdmin(userId, { role: newRole }),
    onSuccess: (_, { newRole }) => {
      toast.success(`User role updated to ${newRole}`)
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update role")
    },
  })

  // Delete user mutation
  const deleteMutation = useMutation({
    mutationFn: (userId: number) => deleteUser(userId),
    onSuccess: () => {
      toast.success("User deleted")
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setUserToDelete(null)
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete user")
      setUserToDelete(null)
    },
  })

  const handleRoleChange = useCallback((userId: number, newRole: string) => {
    roleChangeMutation.mutate({ userId, newRole })
  }, [roleChangeMutation])

  const confirmDelete = useCallback(() => {
    if (userToDelete) {
      deleteMutation.mutate(userToDelete)
    }
  }, [userToDelete, deleteMutation])

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
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Users</h2>
          <p className="text-sm text-muted-foreground">
            Manage user access and roles.
          </p>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => setSearchQuery("")}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="owner">Owner</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="user">User</SelectItem>
            <SelectItem value="viewer">Viewer</SelectItem>
          </SelectContent>
        </Select>
        {(searchQuery || roleFilter !== "all") && (
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => { setSearchQuery(""); setRoleFilter("all"); }}
          >
            Clear filters
          </Button>
        )}
      </div>

      <div className="rounded-md border bg-card overflow-x-auto">
        <Table className="min-w-[600px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]"></TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Full Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              // Skeleton rows for loading state
              <>
                {[1, 2, 3, 4].map((i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-8 w-8 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                  </TableRow>
                ))}
              </>
            ) : filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  {users.length === 0 ? "No users found." : "No users match the current filters."}
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user: any) => (
                <TableRow 
                  key={user.id}
                  className={highlightedUserId === user.id ? "bg-primary/10 animate-pulse" : ""}
                >
                  <TableCell>
                      <Avatar className="h-8 w-8">
                            <AvatarImage src={getAvatarUrl(user.profile?.avatar || user.avatar)} alt={user.username} />
                            <AvatarFallback>{user.username ? user.username.substring(0,2).toUpperCase() : '??'}</AvatarFallback>
                      </Avatar>
                  </TableCell>
                  <TableCell className="font-medium">{user.username}</TableCell>
                  <TableCell>
                     {user.email}
                  </TableCell>
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
