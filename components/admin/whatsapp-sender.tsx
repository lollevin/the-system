"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Send, 
  Users, 
  Loader2,
  CheckCircle2,
  Search,
  Sparkles,
  Copy,
  MessageSquare,
  Phone,
  ChevronRight
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import type { Profile } from "@/lib/supabase/types"

interface SendQueueItem {
  customer: Profile
  message: string
  sent: boolean
}

export function WhatsAppSender() {
  const [customers, setCustomers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [generating, setGenerating] = useState(false)
  const [sendQueue, setSendQueue] = useState<SendQueueItem[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  
  const supabase = createClient()

  useEffect(() => {
    loadCustomers()
  }, [])

  const loadCustomers = async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "customer")
        .not("phone", "is", null)
        .order("full_name")

      if (data) setCustomers(data as Profile[])
    } catch (err) {
      console.error("Load error:", err)
    } finally {
      setLoading(false)
    }
  }

  const formatPhone = (phone: string | null): string => {
    if (!phone) return ""
    const clean = phone.replace(/\D/g, '')
    if (clean.startsWith("60")) return clean
    if (clean.startsWith("0")) return "60" + clean.substring(1)
    return "60" + clean
  }

  const personalizeMessage = (msg: string, customer: Profile): string => {
    return msg
      .replace(/\{\{name\}\}/g, customer.full_name || "顾客")
      .replace(/\{\{points\}\}/g, String(customer.points_balance || 0))
  }

  // Generate AI message
  const generateMessage = async () => {
    setGenerating(true)
    try {
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          goal: "生成一条简短的 WhatsApp 促销消息，要友好亲切，使用 emoji，100字以内" 
        })
      })

      const contentType = response.headers.get("content-type")
      if (contentType?.includes("application/json")) {
        const result = await response.json()
        if (result.message) {
          // Extract just the message part if it contains markdown
          let msg = result.message
          if (msg.includes("###")) {
            const match = msg.match(/###.*?\n\n([\s\S]*?)(\n\n---|$)/)
            if (match) msg = match[1].trim()
          }
          setMessage(msg)
          toast.success("AI 消息已生成")
        }
      } else {
        // Fallback message
        setMessage(`🍔 Hey {{name}}！

好久不见！想你了～ 

本周特惠：消费满 RM30 送免费饮料！

快来 JP&Co 吧！我们等你哦 ☺️

- JP&Co 团队 🍟`)
        toast.info("使用默认消息模板")
      }
    } catch (err) {
      console.error("AI error:", err)
      setMessage(`🍔 Hey {{name}}！

好久不见！想你了～ 

本周特惠：消费满 RM30 送免费饮料！

快来 JP&Co 吧！我们等你哦 ☺️

- JP&Co 团队 🍟`)
      toast.info("使用默认消息模板")
    } finally {
      setGenerating(false)
    }
  }

  // Create send queue
  const createSendQueue = () => {
    if (!message.trim()) {
      toast.error("请先输入消息内容")
      return
    }

    const filtered = customers.filter(c => {
      if (!searchQuery) return true
      const q = searchQuery.toLowerCase()
      return c.full_name?.toLowerCase().includes(q) || c.phone?.includes(q)
    })

    if (filtered.length === 0) {
      toast.error("没有找到客户")
      return
    }

    const queue = filtered.map(customer => ({
      customer,
      message: personalizeMessage(message, customer),
      sent: false
    }))

    setSendQueue(queue)
    setCurrentIndex(0)
    toast.success(`已添加 ${queue.length} 位客户到发送队列`)
  }

  // Send to one customer
  const sendToCustomer = async (index: number) => {
    const item = sendQueue[index]
    if (!item || item.sent) return

    const phone = formatPhone(item.customer.phone)
    const encodedMessage = encodeURIComponent(item.message)
    const waUrl = `https://wa.me/${phone}?text=${encodedMessage}`

    // Open WhatsApp
    window.open(waUrl, "_blank")

    // Mark as sent
    const newQueue = [...sendQueue]
    newQueue[index].sent = true
    setSendQueue(newQueue)

    // Record in database
    try {
      await supabase.from("sent_messages").insert({
        customer_id: item.customer.id,
        message_type: "promotion",
        message_content: item.message,
        channel: "whatsapp",
        status: "sent"
      })
    } catch (e) {
      // Ignore if table doesn't exist
    }

    // Move to next
    if (index < sendQueue.length - 1) {
      setCurrentIndex(index + 1)
    }

    toast.success(`已打开 WhatsApp - ${item.customer.full_name}`)
  }

  // Copy message
  const copyMessage = async (msg: string) => {
    const { copyToClipboard } = await import("@/lib/utils")
    await copyToClipboard(msg)
    toast.success("Message copied")
  }

  const sentCount = sendQueue.filter(q => q.sent).length
  const filteredCustomers = customers.filter(c => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return c.full_name?.toLowerCase().includes(q) || c.phone?.includes(q)
  })

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Left: Message Composer */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            编写消息
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* AI Generate */}
          <Button 
            onClick={generateMessage} 
            variant="outline" 
            className="w-full gap-2"
            disabled={generating}
          >
            {generating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            AI 生成消息
          </Button>

          {/* Message Input */}
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">
              消息内容（使用 {"{{name}}"} 和 {"{{points}}"} 自动替换）
            </label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="输入要发送的消息..."
              rows={8}
            />
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="搜索客户名字或手机号..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Stats */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>找到 {filteredCustomers.length} 位客户</span>
            {sendQueue.length > 0 && (
              <span>已发送 {sentCount}/{sendQueue.length}</span>
            )}
          </div>

          {/* Create Queue Button */}
          <Button 
            onClick={createSendQueue} 
            className="w-full gap-2"
            disabled={!message.trim() || filteredCustomers.length === 0}
          >
            <Users className="w-4 h-4" />
            创建发送队列 ({filteredCustomers.length} 人)
          </Button>
        </CardContent>
      </Card>

      {/* Right: Send Queue */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="w-5 h-5" />
            发送队列
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sendQueue.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Phone className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>点击"创建发送队列"开始</p>
              <p className="text-sm mt-2">将会显示每位客户的发送按钮</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {sendQueue.map((item, index) => (
                  <div
                    key={item.customer.id}
                    className={`p-3 rounded-lg border transition-colors ${
                      item.sent 
                        ? "bg-green-500/10 border-green-500/30" 
                        : index === currentIndex 
                          ? "bg-primary/10 border-primary/30" 
                          : "bg-card border-border"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                          item.sent ? "bg-green-500 text-white" : "bg-muted"
                        }`}>
                          {item.sent ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : (
                            index + 1
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{item.customer.full_name || "未知"}</p>
                          <p className="text-xs text-muted-foreground">{item.customer.phone}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyMessage(item.message)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => sendToCustomer(index)}
                          disabled={item.sent}
                          className={item.sent ? "bg-green-500" : ""}
                        >
                          {item.sent ? (
                            <>
                              <CheckCircle2 className="w-4 h-4 mr-1" />
                              已发送
                            </>
                          ) : (
                            <>
                              <Send className="w-4 h-4 mr-1" />
                              发送
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                    {/* Preview message */}
                    <div className="mt-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded max-h-20 overflow-hidden">
                      {item.message.substring(0, 100)}...
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          {/* Quick Actions */}
          {sendQueue.length > 0 && (
            <div className="mt-4 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSendQueue([])
                  setCurrentIndex(0)
                }}
              >
                清空队列
              </Button>
              {currentIndex < sendQueue.length && !sendQueue[currentIndex]?.sent && (
                <Button
                  size="sm"
                  onClick={() => sendToCustomer(currentIndex)}
                  className="flex-1 gap-2"
                >
                  <ChevronRight className="w-4 h-4" />
                  发送下一个 ({currentIndex + 1}/{sendQueue.length})
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
