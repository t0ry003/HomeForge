"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { DynamicBreadcrumbs } from "@/components/dynamic-breadcrumbs"
import { ModeToggle } from "@/components/mode-toggle"
import { fetchProfile, getAvatarUrl } from "@/lib/apiClient"
import { Loader2 } from "lucide-react"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const data = await fetchProfile()
        setUser({
          name: `${data.first_name} ${data.last_name}`,
          email: data.email,
          avatar: getAvatarUrl(data.profile?.avatar || data.avatar),
        })
        setIsAuthorized(true)
      } catch (error: any) {
        if (error.status === 401) {
          router.push('/login')
        }
      }
    }
    checkAuth()
  }, [router])

  if (!isAuthorized) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 justify-between">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <DynamicBreadcrumbs />
          </div>
          <ModeToggle />
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
