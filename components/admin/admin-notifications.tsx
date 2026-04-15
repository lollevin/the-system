"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { 
  Bell, 
  UserPlus, 
  AlertTriangle, 
  DollarSign,
  AlertCircle,
  Check,
  Trash2,
  Loader2
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { formatDistanceToNow } from "date-fns"
import { zhCN, enUS, ms } from "date-fns/locale"
import { useLanguage } from "@/lib/i18n"

interface AdminNotification {
  id: string
  type: "new_customer" | "staff_alert" | "system_alert" | "large_transaction"
  title: string
  message: string
  severity: "info" | "warning" | "error"
  related_user_id: string | null
  related_staff_id: string | null
  metadata: Record<string, any>
  is_read: boolean
  created_at: string
}

export function AdminNotifications() {
  const [notifications, setNotifications] = useState<AdminNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  
  const supabase = createClient()
  const { language, t } = useLanguage()

  useEffect(() => {
    setIsMounted(true)
    loadNotifications()
    
    // Subscribe to new notifications
    const channel = supabase
      .channel("admin-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "admin_notifications" },
        (payload) => {
          const newNotif = payload.new as AdminNotification
          // Skip new_customer notifications - only show staff/system alerts
          if (newNotif.type === "new_customer") return
          setNotifications(prev => [newNotif, ...prev])
          setUnreadCount(prev => prev + 1)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const loadNotifications = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from("admin_notifications")
        .select("*")
        .neq("type", "new_customer") // Only show staff alerts, not new customer registrations
        .order("created_at", { ascending: false })
        .limit(50)

      if (error) throw error

      if (data) {
        setNotifications(data)
        setUnreadCount(data.filter(n => !n.is_read).length)
      }
    } catch (err) {
      console.error("Error loading notifications:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const markAsRead = async (id: string) => {
    try {
      await supabase
        .from("admin_notifications")
        .update({ is_read: true })
        .eq("id", id)

      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (err) {
      console.error("Error marking as read:", err)
    }
  }

  const markAllAsRead = async () => {
    try {
      await supabase
        .from("admin_notifications")
        .update({ is_read: true })
        .eq("is_read", false)

      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch (err) {
      console.error("Error marking all as read:", err)
    }
  }

  const deleteNotification = async (id: string) => {
    try {
      await supabase
        .from("admin_notifications")
        .delete()
        .eq("id", id)

      const notification = notifications.find(n => n.id === id)
      setNotifications(prev => prev.filter(n => n.id !== id))
      if (notification && !notification.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (err) {
      console.error("Error deleting notification:", err)
    }
  }

  const getIcon = (type: string, severity: string) => {
    switch (type) {
      case "new_customer":
        return <UserPlus className="h-4 w-4 text-green-500" />
      case "staff_alert":
        return <AlertTriangle className="h-4 w-4 text-orange-500" />
      case "large_transaction":
        return <DollarSign className="h-4 w-4 text-amber-500" />
      case "system_alert":
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <Bell className="h-4 w-4" />
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "warning":
        return "bg-amber-500/10 border-amber-500/30"
      case "error":
        return "bg-red-500/10 border-red-500/30"
      default:
        return "bg-card border-border"
    }
  }

  // Get locale for date formatting
  const getLocale = () => {
    switch (language) {
      case "zh": return zhCN
      case "ms": return ms
      default: return enUS
    }
  }

  if (!isMounted) return null

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative text-muted-foreground hover:text-foreground"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-[#8b6f47] text-[10px] font-bold text-white flex items-center justify-center animate-pulse">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b bg-secondary/30">
          <h3 className="font-semibold">{t("admin", "notifications")}</h3>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs h-7 text-[#8b6f47] hover:text-[#7a5f3a]"
              onClick={markAllAsRead}
            >
              <Check className="h-3 w-3 mr-1" />
              {t("admin", "markAllRead")}
            </Button>
          )}
        </div>

        {/* Notifications List */}
        <ScrollArea className="h-[300px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-[#8b6f47]" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Bell className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">{t("admin", "noNotifications")}</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div 
                  key={notification.id}
                  className={`p-3 hover:bg-muted/50 transition-colors ${
                    !notification.is_read ? "bg-[#8b6f47]/5" : ""
                  }`}
                >
                  <div className="flex gap-3">
                    <div className={`mt-0.5 p-1.5 rounded-full ${getSeverityColor(notification.severity)}`}>
                      {getIcon(notification.type, notification.severity)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-sm truncate">
                          {notification.title}
                        </p>
                        {!notification.is_read && (
                          <span className="h-2 w-2 rounded-full bg-[#8b6f47] shrink-0 mt-1.5" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(notification.created_at), { 
                            addSuffix: true,
                            locale: getLocale()
                          })}
                        </span>
                        <div className="flex gap-1">
                          {!notification.is_read && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 hover:text-[#8b6f47]"
                              onClick={() => markAsRead(notification.id)}
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-red-500"
                            onClick={() => deleteNotification(notification.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
