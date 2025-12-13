
"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard,
  Settings,
  Command,
  Cpu,
  Network,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { fetchProfile, getAvatarUrl } from "@/lib/apiClient"

export function AppSidebar({ user: initialUser, ...props }: React.ComponentProps<typeof Sidebar> & { user?: any }) {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = React.useState(initialUser || {
    name: "User",
    email: "",
    avatar: "",
  })

  React.useEffect(() => {
    if (initialUser) {
      setUser(initialUser)
      return
    }

    const loadUser = () => {
      fetchProfile()
        .then((data) => {
          setUser({
            name: `${data.first_name} ${data.last_name}`,
            email: data.email,
            avatar: getAvatarUrl(data.profile?.avatar || data.avatar),
          })
        })
        .catch((err) => {
          console.error("Failed to load user", err)
          if (err.status === 401) {
            router.push('/login')
          }
        })
    }

    loadUser()
    window.addEventListener('profile-updated', loadUser)
    return () => window.removeEventListener('profile-updated', loadUser)
  }, [initialUser])

  const navMain = [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
      isActive: true,
    },
    {
      title: "Device Builder",
      url: "/dashboard/device-builder",
      icon: Cpu,
    },
    {
      title: "Topology",
      url: "/dashboard/topology",
      icon: Network,
    },
    {
      title: "Settings",
      url: "/dashboard/settings",
      icon: Settings,
    },
  ]

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="#">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <Command className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">OpenDash</span>
                  <span className="truncate text-xs">Smart Home</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
