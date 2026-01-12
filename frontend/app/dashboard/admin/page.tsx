"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useUser } from "@/components/user-provider"
import { Users, Home, Cpu, Shield, ArrowRight } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function AdminPage() {
  const { user } = useUser()

  const adminModules = [
    {
      title: "User Management",
      description: "Manage users, roles, and permissions.",
      icon: Users,
      href: "/dashboard/admin/users",
      color: "text-blue-500",
      bg: "bg-blue-500/10"
    },
    {
      title: "Room Management",
      description: "Create and configure rooms and spaces.",
      icon: Home,
      href: "/dashboard/admin/rooms",
      color: "text-green-500",
      bg: "bg-green-500/10"
    },
    {
      title: "Device Types",
      description: "Define and approve new device definitions.",
      icon: Cpu,
      href: "/dashboard/admin/device-types",
      color: "text-purple-500",
      bg: "bg-purple-500/10"
    }
  ]

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight">Admin Console</h2>
        <p className="text-muted-foreground">
          Welcome back, {user?.first_name}. Manage your HomeForge infrastructure from here.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {adminModules.map((module) => (
            <Link key={module.title} href={module.href}>
                <Card className="h-full hover:shadow-md transition-all hover:border-primary/50 group cursor-pointer">
                    <CardHeader>
                        <div className={`p-3 w-fit rounded-lg ${module.bg} mb-4`}>
                            <module.icon className={`w-6 h-6 ${module.color}`} />
                        </div>
                        <CardTitle className="group-hover:text-primary transition-colors">{module.title}</CardTitle>
                        <CardDescription>{module.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <Button variant="ghost" className="p-0 h-auto font-medium text-sm group-hover:translate-x-1 transition-transform">
                            Open Manager <ArrowRight className="ml-1 w-4 h-4" />
                         </Button>
                    </CardContent>
                </Card>
            </Link>
        ))}
      </div>
      
      <Card className="bg-muted/30 border-dashed">
          <CardHeader>
               <div className="flex items-center gap-2 text-muted-foreground">
                   <Shield className="w-5 h-5" />
                   <CardTitle className="text-lg">System Status</CardTitle>
               </div>
          </CardHeader>
          <CardContent>
              <div className="flex gap-4 text-sm">
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
