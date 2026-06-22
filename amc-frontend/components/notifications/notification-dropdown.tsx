"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Bell, CheckCheck, Loader2, AlertTriangle, Info, AlertCircle, ExternalLink } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { useInAppNotifications } from "@/hooks/use-in-app-notifications"
import type { NotificationEvent } from "@/hooks/use-in-app-notifications"

const severityIcon = {
  critical: AlertTriangle,
  warning: AlertCircle,
  info: Info,
}

const severityColor = {
  critical: "text-red-500",
  warning: "text-amber-500",
  info: "text-blue-500",
}

const severityBg = {
  critical: "bg-red-50 dark:bg-red-950/30",
  warning: "bg-amber-50 dark:bg-amber-950/30",
  info: "bg-blue-50 dark:bg-blue-950/30",
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const { useUnreadCount, useNotificationsList, useMarkAsRead, useMarkAllAsRead } = useInAppNotifications()

  const { data: unreadCount = 0 } = useUnreadCount()
  const { data: notificationsData, isLoading } = useNotificationsList(1, 10)
  const markAsRead = useMarkAsRead()
  const markAllAsRead = useMarkAllAsRead()

  const notifications = notificationsData?.data ?? []

  const handleNotificationClick = (notification: NotificationEvent) => {
    if (!notification.is_read) {
      markAsRead.mutate(notification.id)
    }
    if (notification.link) {
      router.push(notification.link)
      setOpen(false)
    }
  }

  const handleMarkAllRead = () => {
    markAllAsRead.mutate()
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 text-muted-foreground hover:text-foreground"
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white leading-none">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-[380px] max-h-[480px]"
        align="end"
        sideOffset={8}
      >
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto text-xs text-muted-foreground gap-1"
              onClick={handleMarkAllRead}
              disabled={markAllAsRead.isPending}
            >
              {markAllAsRead.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <CheckCheck className="h-3 w-3" />
              )}
              Mark all read
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="overflow-y-auto max-h-[380px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Bell className="h-8 w-8 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Notifications will appear here in real-time
              </p>
            </div>
          ) : (
            <DropdownMenuGroup>
              {notifications.map((notification) => {
                const Icon = severityIcon[notification.severity] ?? Info
                return (
                  <DropdownMenuItem
                    key={notification.id}
                    className={cn(
                      "flex items-start gap-3 px-4 py-3 cursor-pointer border-b border-border/40 last:border-0",
                      !notification.is_read && severityBg[notification.severity],
                      !notification.is_read && "font-medium"
                    )}
                    onSelect={() => handleNotificationClick(notification)}
                  >
                    <Icon className={cn("h-5 w-5 mt-0.5 shrink-0", severityColor[notification.severity])} />
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-sm truncate",
                        !notification.is_read && "font-semibold"
                      )}>
                        {notification.title}
                      </p>
                      {notification.message && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {notification.message}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-muted-foreground/60">
                          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                        </span>
                        {notification.link && (
                          <ExternalLink className="h-3 w-3 text-muted-foreground/40" />
                        )}
                      </div>
                    </div>
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuGroup>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
