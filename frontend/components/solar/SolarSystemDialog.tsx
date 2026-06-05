"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { SolarProvider, SolarSystem } from "@/lib/solar-types"

const PROVIDERS: { value: SolarProvider; label: string }[] = [
  { value: "fronius", label: "Fronius Solar API V1" },
]

export interface SolarSystemPayload {
  name: string
  base_url: string
  provider: SolarProvider
}

interface SolarSystemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingSystem?: SolarSystem | null
  onSubmit: (payload: SolarSystemPayload) => void
  isPending?: boolean
}

export function SolarSystemDialog({
  open,
  onOpenChange,
  editingSystem,
  onSubmit,
  isPending,
}: SolarSystemDialogProps) {
  const [name, setName] = React.useState("")
  const [baseUrl, setBaseUrl] = React.useState("")
  const [provider, setProvider] = React.useState<SolarProvider>("fronius")

  React.useEffect(() => {
    if (open) {
      setName(editingSystem?.name ?? "")
      setBaseUrl(editingSystem?.base_url ?? "")
      setProvider(editingSystem?.provider ?? "fronius")
    }
  }, [open, editingSystem])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({ name: name.trim(), base_url: baseUrl.trim(), provider })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {editingSystem ? "Edit solar system" : "Add solar system"}
            </DialogTitle>
            <DialogDescription>
              HomeForge stores only the link to your inverter&apos;s API and
              fetches data server-side. The link is validated on save.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="solar-name">Name</Label>
              <Input
                id="solar-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Rooftop PV"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="solar-url">API URL</Label>
              <Input
                id="solar-url"
                type="url"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="http://fronius-server:9999"
                required
              />
              <p className="text-xs text-muted-foreground">
                Base URL of the vendor API reachable from the HomeForge server.
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="solar-provider">Provider</Label>
              <Select
                value={provider}
                onValueChange={(v) => setProvider(v as SolarProvider)}
              >
                <SelectTrigger id="solar-provider">
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDERS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending
                ? "Saving…"
                : editingSystem
                  ? "Save changes"
                  : "Add system"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
