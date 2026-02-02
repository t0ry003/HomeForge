"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useUser } from "@/components/user-provider"
import { Users, Home, Cpu, Shield, ArrowRight, Bug } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function AdminPage() {
  const { user } = useUser()

  const adminModules = [
    { title: "User Management", description: "Manage users, roles, and permissions.", icon: Users, href: "/dashboard/admin/users", color: "text-blue-500", bg: "bg-blue-500/10" },
    { title: "Room Management", description: "Create and configure rooms and spaces.", icon: Home, href: "/dashboard/admin/rooms", color: "text-green-500", bg: "bg-green-500/10" },
    { title: "Device Types", description: "Manage device types, approvals, and denied submissions.", icon: Cpu, href: "/dashboard/admin/device-types", color: "text-purple-500", bg: "bg-purple-500/10" },
    { title: "Device Debug", description: "Test device states and debug UI behavior.", icon: Bug, href: "/dashboard/admin/debug", color: "text-orange-500", bg: "bg-orange-500/10" }
  ]

  return (
    <div className="p-4 md:p-6 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Admin Console</h2>
        <p className="text-sm text-muted-foreground">
          Welcome back, {user?.first_name}. Manage your HomeForge infrastructure from here.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {adminModules.map((module) => (
          <Link key={module.title} href={module.href}>
            <Card className="h-full hover:shadow-md transition-all hover:border-primary/50 group cursor-pointer">
              <CardHeader className="pb-2">
                <div className={`p-3 w-fit rounded-lg ${module.bg} mb-3`}>
                  <module.icon className={`w-5 h-5 ${module.color}`} />
                </div>
                <CardTitle className="text-base group-hover:text-primary transition-colors">{module.title}</CardTitle>
                <CardDescription className="text-sm">{module.description}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button variant="ghost" className="p-0 h-auto font-medium text-sm group-hover:translate-x-1 transition-transform">
                  Open <ArrowRight className="ml-1 w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
      
      <Card className="bg-muted/30 border-dashed">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Shield className="w-5 h-5" />
            <CardTitle className="text-base">System Status</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span>API Services Online</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span>Database Connected</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
