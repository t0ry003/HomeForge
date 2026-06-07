"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus, Pencil, Trash2, WifiOff, RefreshCw, Sun } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useUser } from "@/components/user-provider"
import {
  fetchSolarSystems,
  createSolarSystem,
  updateSolarSystem,
  deleteSolarSystem,
  fetchSolarOverview,
} from "@/lib/apiClient"
import type { SolarSystem, SolarOverview } from "@/lib/solar-types"
import { PowerFlowDiagram } from "@/components/solar/PowerFlowDiagram"
import { SolarStatCards } from "@/components/solar/SolarStatCards"
import { LivePowerChart } from "@/components/solar/LivePowerChart"
import { SolarEmptyState } from "@/components/solar/SolarEmptyState"
import {
  SolarSystemDialog,
  type SolarSystemPayload,
} from "@/components/solar/SolarSystemDialog"

export default function SolarPage() {
  const { user } = useUser()
  const role = user?.profile?.role || user?.role
  const canManage = role === "admin" || role === "owner"
  const queryClient = useQueryClient()

  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [editingSystem, setEditingSystem] = React.useState<SolarSystem | null>(null)
  const [confirmDelete, setConfirmDelete] = React.useState(false)

  const { data: systems = [], isLoading: systemsLoading } = useQuery({
    queryKey: ["solarSystems"],
    queryFn: async () => {
      const data = await fetchSolarSystems()
      return (Array.isArray(data) ? data : data.results || []) as SolarSystem[]
    },
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
  })

  const system = systems[0] ?? null
  const systemId = system?.id ?? null

  const { data: overview, isLoading: overviewLoading } = useQuery<SolarOverview>({
    queryKey: ["solarOverview", systemId],
    queryFn: () => fetchSolarOverview(systemId as number),
    enabled: !!systemId,
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
    staleTime: 4000,
  })

  const createMutation = useMutation({
    mutationFn: (payload: SolarSystemPayload) => createSolarSystem(payload),
    onSuccess: () => {
      toast.success("Solar system added")
      queryClient.invalidateQueries({ queryKey: ["solarSystems"] })
      setIsDialogOpen(false)
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to add solar system")
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: SolarSystemPayload }) =>
      updateSolarSystem(id, payload),
    onSuccess: () => {
      toast.success("Solar system updated")
      queryClient.invalidateQueries({ queryKey: ["solarSystems"] })
      queryClient.invalidateQueries({ queryKey: ["solarOverview"] })
      setIsDialogOpen(false)
      setEditingSystem(null)
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update solar system")
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteSolarSystem(id),
    onSuccess: () => {
      toast.success("Solar system deleted")
      queryClient.invalidateQueries({ queryKey: ["solarSystems"] })
      setConfirmDelete(false)
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete solar system")
      setConfirmDelete(false)
    },
  })

  const handleAdd = React.useCallback(() => {
    setEditingSystem(null)
    setIsDialogOpen(true)
  }, [])

  const handleEdit = React.useCallback(() => {
    if (system) {
      setEditingSystem(system)
      setIsDialogOpen(true)
    }
  }, [system])

  const handleSubmit = React.useCallback(
    (payload: SolarSystemPayload) => {
      if (editingSystem) {
        updateMutation.mutate({ id: editingSystem.id, payload })
      } else {
        createMutation.mutate(payload)
      }
    },
    [editingSystem, updateMutation, createMutation]
  )

  return (
    <div className="space-y-6 py-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-foreground">
          <Sun className="h-5 w-5 text-primary" />
          <span className="text-lg font-semibold tracking-tight">Solar</span>
        </div>
        {!system && canManage && !systemsLoading && (
          <Button size="sm" onClick={handleAdd}>
            <Plus className="mr-2 h-4 w-4" /> Add solar system
          </Button>
        )}
      </div>

      {systemsLoading ? (
        <div className="space-y-4">
          <Skeleton className="mx-auto aspect-square w-full max-w-md" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </div>
      ) : !system ? (
        <SolarEmptyState canManage={canManage} onAdd={handleAdd} />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-lg font-semibold">{system.name}</span>
            <Badge variant="secondary" className="capitalize">
              {system.provider}
            </Badge>
            {overview ? (
              overview.online ? (
                <Badge>Online</Badge>
              ) : (
                <Badge variant="destructive">Offline</Badge>
              )
            ) : (
              <Badge variant="outline">Connecting…</Badge>
            )}
            {canManage && (
              <div className="ml-auto flex gap-2">
                <Button variant="outline" size="sm" onClick={handleEdit}>
                  <Pencil className="mr-2 h-4 w-4" /> Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmDelete(true)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </Button>
              </div>
            )}
          </div>

          {overview && !overview.online && (
            <Card className="border-destructive/40">
              <CardContent className="flex items-center gap-3 p-4 text-sm">
                <WifiOff className="h-5 w-5 text-destructive" />
                <span className="text-muted-foreground">
                  {overview.status.message || "System is unreachable."}
                </span>
              </CardContent>
            </Card>
          )}

          {overviewLoading && !overview ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin" /> Loading power flow…
            </div>
          ) : overview ? (
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardContent className="p-4 sm:p-6">
                  <PowerFlowDiagram overview={overview} />
                </CardContent>
              </Card>
              <LivePowerChart key={systemId} overview={overview} />
              <div className="lg:col-span-2">
                <SolarStatCards overview={overview} />
              </div>
            </div>
          ) : null}
        </>
      )}

      <SolarSystemDialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open)
          if (!open) setEditingSystem(null)
        }}
        editingSystem={editingSystem}
        onSubmit={handleSubmit}
        isPending={createMutation.isPending || updateMutation.isPending}
      />

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete solar system</DialogTitle>
            <DialogDescription>
              This removes the link to {system?.name}. Live data will no longer
              be available. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDelete(false)}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => system && deleteMutation.mutate(system.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
