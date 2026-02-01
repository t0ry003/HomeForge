"use client"

import { useEffect, useState } from "react"
import { X, ShieldAlert, Edit, Plus, Eye } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { useRouter } from "next/navigation"

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
import { Badge } from "@/components/ui/badge"
import { fetchDeviceTypes, deleteDeviceType } from "@/lib/apiClient"

function getComponentSummary(definition: any): string {
  if (!definition || !Array.isArray(definition.structure) && !Array.isArray(definition)) return "Unknown";
  
  const counts: Record<string, number> = {};
  
  const traverse = (nodes: any[]) => {
      nodes.forEach(n => {
          counts[n.type] = (counts[n.type] || 0) + 1;
          if (n.children) traverse(n.children);
      });
  };

  const root = Array.isArray(definition.structure) ? definition.structure : (Array.isArray(definition) ? definition : []);
  traverse(root);
  
  const parts = Object.entries(counts).map(([type, count]) => {
      if (type === 'mcu') return null; // Skip MCU usually
      return `${count}x ${type}`;
  }).filter(Boolean);

  return parts.length > 0 ? parts.join(', ') : "MCU Only";
}

export default function DeviceTypesPage() {
  const router = useRouter()
  const [deviceTypes, setDeviceTypes] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const loadDeviceTypes = async () => {
    try {
      setIsLoading(true)
      const data = await fetchDeviceTypes()
      setDeviceTypes(Array.isArray(data) ? data : (data.results || []))
    } catch (error: any) {
      toast.error(error.message || "Failed to load device types")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadDeviceTypes()
  }, [])

  const confirmReject = async () => {
    if (!deleteId) return
    try {
      await deleteDeviceType(deleteId)
      toast.success("Device type rejected/deleted")
      loadDeviceTypes()
    } catch (error: any) {
      toast.error(error.message || "Failed to delete device type")
    } finally {
      setDeleteId(null)
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Device Types</h2>
          <p className="text-sm text-muted-foreground">
            Manage device definitions. Pending devices must be reviewed before approval.
          </p>
        </div>
        <Link href="/dashboard/device-builder" className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" /> New Definition
            </Button>
        </Link>
      </div>

      <div className="rounded-md border bg-card overflow-x-auto">
        <Table className="min-w-[500px]">
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Components</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[180px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : deviceTypes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  No device types found.
                </TableCell>
              </TableRow>
            ) : (
              deviceTypes.map((dt) => (
                <TableRow key={dt.id}>
                  <TableCell className="font-medium">{dt.name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                      {getComponentSummary(dt.definition)}
                  </TableCell>
                  <TableCell>
                    {dt.approved ? (
                      <Badge variant="secondary" className="bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/20">Approved</Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 border-yellow-500/20 animate-pulse">Pending</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2 items-center">
                         {/* Edit in Builder - uses edit mode with ID to fetch full data including card_template */}
                         <Link href={`/dashboard/device-builder?edit=${dt.id}`}>
                            <Button variant="ghost" size="icon" title="Edit in Builder">
                                <Edit className="h-4 w-4 text-muted-foreground hover:text-primary" />
                            </Button>
                         </Link>

                        {!dt.approved ? (
                            <>
                                <Button size="sm" variant="outline" className="border-amber-500/50 hover:bg-amber-500/10 hover:text-amber-600 h-8 px-2" onClick={() => router.push('/dashboard/admin/approvals')} title="Go to Pending Approvals">
                                    <Eye className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="outline" className="border-red-500/50 hover:bg-red-500/10 hover:text-red-500 h-8 px-2" onClick={() => setDeleteId(dt.id)}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </>
                        ) : (
                             <Button size="icon" variant="ghost" className="text-muted-foreground hover:text-destructive h-8 w-8" onClick={() => setDeleteId(dt.id)}>
                                <X className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

       <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Reject/Delete Device Type</DialogTitle>
                <DialogDescription>
                    Are you sure you want to delete this device definition? This action cannot be undone.
                </DialogDescription>
            </DialogHeader>
            <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
                <Button variant="destructive" onClick={confirmReject}>Delete</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
