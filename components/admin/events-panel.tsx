"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { 
  Cake, 
  PartyPopper, 
  AlertTriangle, 
  Clock, 
  Star,
  Send,
  Phone,
  MessageSquare,
  ChevronRight,
  Users,
  Loader2,
  CheckCircle2
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

interface CustomerEvent {
  customer_id: string
  customer_name: string | null
  customer_phone: string | null
  event_type: "birthday" | "anniversary" | "churn_risk" | "points_expiry" | "vip_upgrade"
  event_date: string
  days_value: number
}

interface MessageTemplate {
  id: string
  name: string
  type: string
  template: string
}

const eventConfig = {
  birthday: {
    icon: Cake,
    color: "text-pink-500",
    bgColor: "bg-pink-500/10",
    label: "生日",
    badgeColor: "bg-pink-500"
  },
  anniversary: {
    icon: PartyPopper,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    label: "周年",
    badgeColor: "bg-purple-500"
  },
  churn_risk: {
    icon: AlertTriangle,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    label: "流失风险",
    badgeColor: "bg-orange-500"
  },
  points_expiry: {
    icon: Clock,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    label: "积分到期",
    badgeColor: "bg-amber-500"
  },
  vip_upgrade: {
    icon: Star,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
    label: "VIP升级",
    badgeColor: "bg-emerald-500"
  }
}

export function EventsPanel() {
  const [events, setEvents] = useState<CustomerEvent[]>([])
  const [templates, setTemplates] = useState<MessageTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [sendingTo, setSendingTo] = useState<string | null>(null)
  const [sentMessages, setSentMessages] = useState<Set<string>>(new Set())
  
  const supabase = createClient()

  useEffect(() => {
    loadEvents()
    loadTemplates()
  }, [])

  const loadEvents = async () => {
    try {
      // 获取今日事件
      const { data, error } = await supabase.rpc('get_todays_events')
      
      if (error) {
        // 如果函数不存在，使用备用查询
        console.log("Using fallback query for events")
        await loadEventsFallback()
        return
      }
      
      setEvents(data || [])
    } catch (err) {
      console.error("Error loading events:", err)
      await loadEventsFallback()
    } finally {
      setLoading(false)
    }
  }

  const loadEventsFallback = async () => {
    try {
      const today = new Date()
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      // 获取所有客户
      const { data: customers } = await supabase
        .from("profiles")
        .select("id, full_name, phone, birthday, last_visit, created_at")
        .eq("role", "customer")

      if (!customers) return

      const detectedEvents: CustomerEvent[] = []

      customers.forEach(customer => {
        // 检查生日 (今天)
        if (customer.birthday) {
          const bday = new Date(customer.birthday)
          if (bday.getMonth() === today.getMonth() && bday.getDate() === today.getDate()) {
            detectedEvents.push({
              customer_id: customer.id,
              customer_name: customer.full_name,
              customer_phone: customer.phone,
              event_type: "birthday",
              event_date: customer.birthday,
              days_value: 0
            })
          }
        }

        // 检查会员周年
        const createdAt = new Date(customer.created_at)
        if (createdAt.getMonth() === today.getMonth() && 
            createdAt.getDate() === today.getDate() &&
            createdAt.getFullYear() < today.getFullYear()) {
          const years = today.getFullYear() - createdAt.getFullYear()
          detectedEvents.push({
            customer_id: customer.id,
            customer_name: customer.full_name,
            customer_phone: customer.phone,
            event_type: "anniversary",
            event_date: customer.created_at,
            days_value: years
          })
        }

        // 检查流失风险 (30天未到店)
        const lastVisit = customer.last_visit ? new Date(customer.last_visit) : new Date(customer.created_at)
        const daysSinceVisit = Math.floor((today.getTime() - lastVisit.getTime()) / (1000 * 60 * 60 * 24))
        
        if (daysSinceVisit >= 30) {
          detectedEvents.push({
            customer_id: customer.id,
            customer_name: customer.full_name,
            customer_phone: customer.phone,
            event_type: "churn_risk",
            event_date: customer.last_visit || customer.created_at,
            days_value: daysSinceVisit
          })
        }
      })

      setEvents(detectedEvents)
    } catch (err) {
      console.error("Fallback query error:", err)
    }
  }

  const loadTemplates = async () => {
    try {
      const { data } = await supabase
        .from("message_templates")
        .select("*")
        .eq("is_active", true)
      
      if (data) setTemplates(data)
    } catch (err) {
      console.log("Templates not loaded:", err)
    }
  }

  const generateMessage = (event: CustomerEvent): string => {
    const template = templates.find(t => t.type === event.event_type)
    
    if (template) {
      return template.template
        .replace(/\{\{name\}\}/g, event.customer_name || "顾客")
        .replace(/\{\{days\}\}/g, String(event.days_value))
        .replace(/\{\{years\}\}/g, String(event.days_value))
    }

    // 默认消息
    switch (event.event_type) {
      case "birthday":
        return `🎂 ${event.customer_name || ""}，生日快乐！\n\n感谢你成为 JP&Co 的忠实顾客！\n\n为了庆祝你的特别日子，我们送你免费蛋糕一份（今天到店领取）\n\n期待你的光临！🎉\n- JP&Co 团队`
      case "anniversary":
        return `🎊 ${event.customer_name || ""}，恭喜！\n\n今天是你加入 JP&Co 会员满 ${event.days_value} 年的日子！\n\n感谢你一直以来的支持，特送你双倍积分（本周内有效）\n\n- JP&Co 团队`
      case "churn_risk":
        return `👋 ${event.customer_name || ""}，好久不见！\n\n我们想念你了！已经 ${event.days_value} 天没见到你了。\n\n特别为你准备了回归礼：消费满 RM30 送免费饮料\n\n快来 JP&Co 吧！\n- JP&Co 团队`
      default:
        return `Hi ${event.customer_name || ""}！JP&Co 有好消息给你！`
    }
  }

  const formatPhoneForWhatsApp = (phone: string | null): string => {
    if (!phone) return ""
    // 移除所有非数字字符
    let cleaned = phone.replace(/\D/g, "")
    // 如果以0开头，替换为60（马来西亚）
    if (cleaned.startsWith("0")) {
      cleaned = "60" + cleaned.substring(1)
    }
    // 如果没有国家代码，添加60
    if (!cleaned.startsWith("60") && cleaned.length <= 10) {
      cleaned = "60" + cleaned
    }
    return cleaned
  }

  const openWhatsApp = async (event: CustomerEvent) => {
    if (!event.customer_phone) {
      toast.error("该客户没有电话号码")
      return
    }

    setSendingTo(event.customer_id)

    try {
      const phone = formatPhoneForWhatsApp(event.customer_phone)
      const message = generateMessage(event)
      const encodedMessage = encodeURIComponent(message)
      const waUrl = `https://wa.me/${phone}?text=${encodedMessage}`

      // 记录发送历史
      await supabase.from("sent_messages").insert({
        customer_id: event.customer_id,
        message_type: event.event_type,
        message_content: message,
        channel: "whatsapp",
        status: "sent"
      })

      // 打开 WhatsApp
      window.open(waUrl, "_blank")

      // 标记为已发送
      setSentMessages(prev => new Set([...prev, event.customer_id + event.event_type]))
      
      toast.success("WhatsApp 已打开，请发送消息")
    } catch (err) {
      console.error("Error:", err)
      toast.error("发送失败")
    } finally {
      setSendingTo(null)
    }
  }

  const getInitials = (name: string | null) => {
    if (!name) return "?"
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
  }

  // 按事件类型分组
  const groupedEvents = events.reduce((acc, event) => {
    if (!acc[event.event_type]) {
      acc[event.event_type] = []
    }
    acc[event.event_type].push(event)
    return acc
  }, {} as Record<string, CustomerEvent[]>)

  if (loading) {
    return (
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-amber-500" />
            今日事件
          </div>
          <Badge variant="outline" className="font-normal">
            {events.length} 个待处理
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>今天没有特殊事件</p>
            <p className="text-sm">系统会自动检测生日、周年纪念和流失风险客户</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedEvents).map(([eventType, eventList]) => {
              const config = eventConfig[eventType as keyof typeof eventConfig]
              const Icon = config.icon

              return (
                <div key={eventType}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${config.bgColor}`}>
                      <Icon className={`w-4 h-4 ${config.color}`} />
                    </div>
                    <span className="font-medium">{config.label}</span>
                    <Badge className={`${config.badgeColor} text-white`}>
                      {eventList.length}
                    </Badge>
                  </div>

                  <div className="space-y-2 ml-10">
                    {eventList.map((event) => {
                      const isSent = sentMessages.has(event.customer_id + event.event_type)
                      const isSending = sendingTo === event.customer_id

                      return (
                        <div 
                          key={`${event.customer_id}-${event.event_type}`}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="w-10 h-10">
                              <AvatarFallback className="bg-primary/10 text-primary">
                                {getInitials(event.customer_name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{event.customer_name || "未知客户"}</p>
                              <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {event.customer_phone || "无电话"}
                                {event.event_type === "churn_risk" && (
                                  <span className="ml-2 text-orange-500">
                                    {event.days_value} 天未到店
                                  </span>
                                )}
                                {event.event_type === "anniversary" && (
                                  <span className="ml-2 text-purple-500">
                                    {event.days_value} 周年
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>

                          {isSent ? (
                            <Badge variant="outline" className="text-green-500 border-green-500/30">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              已发送
                            </Badge>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => openWhatsApp(event)}
                              disabled={!event.customer_phone || isSending}
                              className="gap-1"
                            >
                              {isSending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <Send className="w-4 h-4" />
                                  发送 WhatsApp
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
