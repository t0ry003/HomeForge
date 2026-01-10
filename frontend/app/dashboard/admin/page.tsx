"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useUser } from "@/components/user-provider"

export default function AdminPage() {
  const { user } = useUser()

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Admin Dashboard</h3>
        <p className="text-sm text-muted-foreground">
          Manage your HomeForge infrastructure.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Welcome
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{user?.first_name}</div>
            <p className="text-xs text-muted-foreground">
              {user?.role === 'owner' ? 'System Owner' : 'Administrator'}
            </p>
          </CardContent>
        </Card>
        {/* We can add stats here later */}
      </div>
    </div>
  )
}
