"use client"

import { Sun, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface SolarEmptyStateProps {
  canManage: boolean
  onAdd: () => void
}

export function SolarEmptyState({ canManage, onAdd }: SolarEmptyStateProps) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Sun className="h-7 w-7" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-semibold">No solar system configured</h3>
          <p className="text-sm text-muted-foreground">
            {canManage
              ? "Add a solar system by linking its API URL to see a live power-flow view."
              : "Ask an administrator to register a solar system to see live data here."}
          </p>
        </div>
        {canManage && (
          <Button onClick={onAdd}>
            <Plus className="mr-2 h-4 w-4" /> Add solar system
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
