"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { markAsRead, markAllAsRead, type HostNotification } from "../notification-actions"

const TYPE_CONFIG: Record<string, { icon: string; color: string }> = {
  property_approved: { icon: "✅", color: "text-green-600" },
  property_rejected: { icon: "❌", color: "text-red-600" },
  property_supplement: { icon: "⚠️", color: "text-orange-600" },
  property_status_changed: { icon: "🔔", color: "text-blue-600" },
}

interface NotificationListProps {
  notifications: HostNotification[]
}

export default function NotificationList({ notifications: initial }: NotificationListProps) {
  const router = useRouter()
  const [notifications, setNotifications] = useState(initial)

  const handleClick = async (notification: HostNotification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id)
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n))
      )
    }
    if (notification.link) {
      router.push(notification.link)
    }
  }

  const handleMarkAllRead = async () => {
    await markAllAsRead()
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
  }

  const hasUnread = notifications.some((n) => !n.is_read)

  return (
    <div className="space-y-4">
      {hasUnread && (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleMarkAllRead}
            className="text-xs text-muted-foreground"
          >
            모두 읽음 처리
          </Button>
        </div>
      )}

      <div className="space-y-2">
        {notifications.map((notification) => {
          const config = TYPE_CONFIG[notification.type] || TYPE_CONFIG.property_status_changed

          return (
            <button
              key={notification.id}
              onClick={() => handleClick(notification)}
              className={`w-full text-left p-4 rounded-xl transition-colors ${
                notification.is_read
                  ? "bg-white border border-border/50"
                  : "bg-primary/5 border border-primary/20"
              } hover:bg-muted/50`}
            >
              <div className="flex items-start gap-3">
                <span className="text-lg flex-shrink-0 mt-0.5">{config.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3
                      className={`text-sm font-medium truncate ${
                        notification.is_read ? "text-muted-foreground" : "text-foreground"
                      }`}
                    >
                      {notification.title}
                    </h3>
                    {!notification.is_read && (
                      <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {notification.message}
                  </p>
                  <p className="text-[11px] text-muted-foreground/60 mt-2">
                    {formatRelativeTime(notification.created_at)}
                  </p>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return "방금 전"
  if (minutes < 60) return `${minutes}분 전`
  if (hours < 24) return `${hours}시간 전`
  if (days < 7) return `${days}일 전`
  return date.toLocaleDateString("ko-KR")
}
