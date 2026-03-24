
"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import Image from "next/image"
import {
  LayoutDashboard,
  Settings,
  Cpu,
  Network,
  Shield,
  Home,
  Users,
  Bug,
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
import { getAvatarUrl } from "@/lib/apiClient"
import { useUser } from "@/components/user-provider"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user: contextUser } = useUser()
  
  // Transform context user to the format expected by NavUser
  const user = React.useMemo(() => {
    if (!contextUser) return { name: "User", email: "", avatar: "" }
    return {
      name: `${contextUser.first_name} ${contextUser.last_name}`,
      email: contextUser.email,
      avatar: getAvatarUrl(contextUser.profile?.avatar || contextUser.avatar) ?? "",
    }
  }, [contextUser])

  const role = contextUser?.profile?.role || contextUser?.role;
  const isAdmin = role === 'admin' || role === 'owner';

  const navMain = React.useMemo(() => {
    const items = [
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
    ];

    if (isAdmin) {
      items.push({
        title: "Admin Panel",
        url: "/dashboard/admin",
        icon: Shield,
        // @ts-ignore
        items: [
          { title: "Rooms", url: "/dashboard/admin/rooms", icon: Home },
          { title: "Users", url: "/dashboard/admin/users", icon: Users },
          { title: "Device Types", url: "/dashboard/admin/device-types", icon: Cpu },
          { title: "Debug", url: "/dashboard/admin/debug", icon: Bug },
        ]
      });
    }

    return items;
  }, [isAdmin]);

  return (
    <Sidebar variant="inset" className="border-r-0 bg-transparent" {...props}>
      <div className="absolute inset-0 bg-sidebar/50 backdrop-blur-xl -z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-[1px] bg-gradient-to-b from-transparent via-primary/20 to-transparent" />
      
      <SidebarHeader className="pb-4 pt-6">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild className="hover:bg-primary/10 transition-colors duration-300 group">
              <a href="#">
                <div className="flex aspect-square size-12 items-center justify-center">
                  <Image 
                    src="/logos/homeforge-v2-color.svg" 
                    alt="HomeForge Logo" 
                    width={48} 
                    height={48} 
                    className="size-12 object-contain dark:block hidden"
                    priority
                  />
                  <div 
                    className="size-12 dark:hidden block bg-primary"
                    style={{
                      maskImage: 'url("/logos/homeforge-v2-bw.svg")',
                      maskSize: 'contain',
                      maskRepeat: 'no-repeat',
                      maskPosition: 'center',
                      WebkitMaskImage: 'url("/logos/homeforge-v2-bw.svg")',
                      WebkitMaskRepeat: 'no-repeat',
                      WebkitMaskPosition: 'center',
                      WebkitMaskSize: 'contain',
                    }}
                  />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight ml-2">
                  <span className="truncate font-bold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">HomeForge</span>
                  <span className="truncate text-xs text-muted-foreground font-medium">Smart Home OS</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="px-2">
        <NavMain items={navMain} />
      </SidebarContent>
      <SidebarFooter className="pb-6 pt-2">
        <div className="px-2 mb-2">
           <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-border to-transparent" />
        </div>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
