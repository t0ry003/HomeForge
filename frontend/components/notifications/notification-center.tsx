"use client"

import * as React from "react"
import { 
  Bell, CheckCircle2, Cpu, AlertTriangle, Info, X, ExternalLink,
  Wifi, WifiOff, AlertCircle
} from "lucide-react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { useUser } from "@/components/user-provider"
import { 
  fetchNotifications,
  fetchUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  bulkDeleteNotifications
} from "@/lib/apiClient"

// Notification type mapping from API
type NotificationType = 
  | 'device_type_pending'
  | 'device_type_approved'
  | 'device_type_denied'
  | 'device_offline'
  | 'device_online'
  | 'device_error'
  | 'system'
  | 'info'
  | 'warning'
  | 'error'

interface ApiNotification {
  id: number
  notification_type: NotificationType
  notification_type_display: string
  title: string
  message: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
  priority_display: string
  is_read: boolean
  reference_data: Record<string, any>
  action_url: string | null
  created_at: string
  read_at: string | null
  time_ago: string
}

// Transform backend action URLs to frontend routes
// Backend returns /admin/... but frontend routes are /dashboard/admin/...
// Also handles individual item URLs that don't have corresponding pages
function getActionUrl(url: string): string {
  // Normalize URL - remove trailing slashes
  const normalizedUrl = url.replace(/\/+$/, '')
  
  // Handle device-types individual item URLs - redirect to list with filter
  // /admin/device-types/22 -> /dashboard/admin/device-types?filter=pending
  // /dashboard/admin/device-types/22 -> /dashboard/admin/device-types?filter=pending
  if (normalizedUrl.match(/\/admin\/device-types\/\d+/)) {
    return '/dashboard/admin/device-types?filter=pending'
  }
  
  if (normalizedUrl.startsWith('/admin/')) {
    return '/dashboard' + normalizedUrl
  }
  if (!normalizedUrl.startsWith('/dashboard') && !normalizedUrl.startsWith('http')) {
    return '/dashboard' + normalizedUrl
  }
  return normalizedUrl
}

const notificationIcons: Record<NotificationType, React.ElementType> = {
  device_type_pending: Cpu,
  device_type_approved: CheckCircle2,
  device_type_denied: AlertTriangle,
  device_offline: WifiOff,
  device_online: Wifi,
  device_error: AlertCircle,
  system: Info,
  info: Info,
  warning: AlertTriangle,
  error: AlertCircle,
}

const notificationColors: Record<NotificationType, string> = {
  device_type_pending: "text-amber-500 bg-amber-500/10",
  device_type_approved: "text-green-500 bg-green-500/10",
  device_type_denied: "text-red-500 bg-red-500/10",
  device_offline: "text-red-500 bg-red-500/10",
  device_online: "text-green-500 bg-green-500/10",
  device_error: "text-orange-500 bg-orange-500/10",
  system: "text-blue-500 bg-blue-500/10",
  info: "text-blue-500 bg-blue-500/10",
  warning: "text-orange-500 bg-orange-500/10",
  error: "text-red-500 bg-red-500/10",
}

const priorityColors: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  normal: "bg-blue-500/10 text-blue-500",
  high: "bg-orange-500/10 text-orange-500",
  urgent: "bg-red-500/10 text-red-500",
}

function NotificationItem({ 
  notification, 
  onDismiss,
  onMarkRead 
}: { 
  notification: ApiNotification
  onDismiss: (id: number) => void
  onMarkRead: (id: number) => void
}) {
  const Icon = notificationIcons[notification.notification_type] || Info
  const colorClass = notificationColors[notification.notification_type] || "text-blue-500 bg-blue-500/10"

  return (
    <div 
      className={cn(
        "relative p-3 rounded-lg transition-colors cursor-pointer",
        notification.is_read ? "opacity-60" : "bg-muted/50 hover:bg-muted/70"
      )}
      onClick={() => !notification.is_read && onMarkRead(notification.id)}
    >
      <div className="flex gap-3">
        <div className={cn("p-2 rounded-lg shrink-0 h-fit", colorClass)}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <p className="text-sm font-medium leading-tight">{notification.title}</p>
              {notification.priority !== 'normal' && (
                <Badge 
                  variant="secondary" 
                  className={cn("mt-1 text-[10px] px-1.5 py-0", priorityColors[notification.priority])}
                >
                  {notification.priority_display}
                </Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0 opacity-50 hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation()
                onDismiss(notification.id)
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {notification.message}
          </p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-[10px] text-muted-foreground">
              {notification.time_ago}
            </span>
            {notification.action_url && (
              <Link 
                href={getActionUrl(notification.action_url)} 
                onClick={(e) => e.stopPropagation()}
              >
                <Button variant="link" size="sm" className="h-auto p-0 text-xs">
                  View <ExternalLink className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
      {!notification.is_read && (
        <div className="absolute top-3 right-10 w-2 h-2 rounded-full bg-primary" />
      )}
    </div>
  )
}

export function NotificationCenter() {
  const { user } = useUser() as { user: any }
  const queryClient = useQueryClient()
  const [open, setOpen] = React.useState(false)

  // Invalidate notifications when user changes (login/logout)
  React.useEffect(() => {
    if (user) {
      // User just logged in - refetch notifications immediately
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    } else {
      // User logged out - clear notification cache
      queryClient.removeQueries({ queryKey: ['notifications'] })
    }
  }, [user?.id, queryClient])

  // Fetch unread count for badge
  const { data: unreadData } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: fetchUnreadNotificationCount,
    staleTime: 30000,
    refetchInterval: 30000,
    refetchOnMount: 'always', // Always refetch on mount/page load
    enabled: !!user, // Only fetch if user is logged in
  })

  // Fetch notifications when popover opens
  const { data: notificationsData, isLoading } = useQuery({
    queryKey: ['notifications', 'list'],
    queryFn: () => fetchNotifications(),
    enabled: open,
    staleTime: 10000,
  })

  const notifications: ApiNotification[] = notificationsData?.results || []
  const unreadCount = unreadData?.unread_count || 0

  // Mark as read mutation
  const markReadMutation = useMutation({
    mutationFn: markNotificationAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  // Mark all as read mutation
  const markAllReadMutation = useMutation({
    mutationFn: () => markAllNotificationsAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  // Delete notification mutation
  const deleteMutation = useMutation({
    mutationFn: deleteNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: () => bulkDeleteNotifications({}), // Deletes all read notifications
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const handleMarkRead = React.useCallback((id: number) => {
    markReadMutation.mutate(id)
  }, [markReadMutation])

  const handleDismiss = React.useCallback((id: number) => {
    deleteMutation.mutate(id)
  }, [deleteMutation])

  const handleMarkAllRead = React.useCallback(() => {
    markAllReadMutation.mutate()
  }, [markAllReadMutation])

  const handleClearAll = React.useCallback(() => {
    bulkDeleteMutation.mutate()
  }, [bulkDeleteMutation])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative h-9 w-9 rounded-lg hover:bg-sidebar-accent shrink-0"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-4 w-4 bg-primary text-[10px] font-bold text-primary-foreground items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 p-0" 
        align="start"
        side="right"
        sideOffset={8}
      >
        <div className="flex items-center justify-between p-3 border-b">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-sm">Notifications</h4>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {unreadCount} new
              </Badge>
            )}
          </div>
          {notifications.length > 0 && unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 px-2 text-xs"
              onClick={handleMarkAllRead}
              disabled={markAllReadMutation.isPending}
            >
              Mark all read
            </Button>
          )}
        </div>

        <ScrollArea className="h-[300px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-[250px] text-muted-foreground">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-xs">Loading...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[250px] text-muted-foreground">
              <Bell className="w-10 h-10 opacity-20 mb-3" />
              <p className="text-sm font-medium">No notifications</p>
              <p className="text-xs opacity-75">You&apos;re all caught up!</p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onDismiss={handleDismiss}
                  onMarkRead={handleMarkRead}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        {notifications.length > 0 && (
          <>
            <Separator />
            <div className="p-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full h-8 text-xs text-muted-foreground"
                onClick={handleClearAll}
                disabled={bulkDeleteMutation.isPending}
              >
                Clear read notifications
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}
