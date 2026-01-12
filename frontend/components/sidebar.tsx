"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { LayoutDashboard, Settings, LogOut, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { fetchProfile, getAvatarUrl } from "@/lib/apiClient"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ModeToggle } from "@/components/mode-toggle"

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const loadUser = () => {
      fetchProfile()
        .then(setUser)
        .catch(() => {
          // If fetch fails, maybe redirect to login or just show nothing
          // router.push("/login")
        })
    }

    loadUser()

    const handleProfileUpdate = () => {
      loadUser()
    }
    
    window.addEventListener('profile-updated', handleProfileUpdate)
    return () => window.removeEventListener('profile-updated', handleProfileUpdate)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem("access")
    localStorage.removeItem("refresh")
    router.push("/login")
  }

  return (
    <div className={cn("pb-12 min-h-screen border-r bg-background", className)}>
      <div className="space-y-4 py-4">
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
            HomeForge
          </h2>
          <div className="space-y-1">
            <Link href="/dashboard">
              <Button variant={pathname === "/dashboard" ? "secondary" : "ghost"} className="w-full justify-start">
                <LayoutDashboard className="mr-2 h-4 w-4" />
                Dashboard
              </Button>
            </Link>
            <Link href="/dashboard/settings">
              <Button variant={pathname === "/dashboard/settings" ? "secondary" : "ghost"} className="w-full justify-start">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Button>
            </Link>
          </div>
        </div>
      </div>
      
      <div className="absolute bottom-4 left-0 w-full px-3">
        <div className="flex items-center gap-4 mb-4 px-4">
           <ModeToggle />
           <span className="text-sm text-muted-foreground">Theme</span>
        </div>

        {user && (
          <div className="flex items-center gap-3 px-4 py-3 mb-2 rounded-lg bg-muted/50">
            <Avatar>
              <AvatarImage src={getAvatarUrl(user.profile?.avatar || user.avatar)} />
              <AvatarFallback>{user.username?.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-medium truncate">{user.first_name} {user.last_name}</span>
              <span className="text-xs text-muted-foreground truncate">{user.email}</span>
            </div>
          </div>
        )}
        
        <Button variant="ghost" className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  )
}
