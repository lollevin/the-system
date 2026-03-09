"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import { Progress } from "@/components/ui/progress"
import { 
  Send, 
  Users, 
  MessageSquare,
  Loader2,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  Sparkles,
  Copy,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Wifi,
  WifiOff,
  Zap,
  Brain
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import type { Profile } from "@/lib/supabase/types"
import { WhatsAppConnection } from "./whatsapp-connection"

interface BulkWhatsAppProps {
  testPhone?: string
}

interface SendResult {
  customerId: string
  customerName: string
  phone: string
  success: boolean
  error?: string
}

export function BulkWhatsApp({ testPhone = "0123992748" }: BulkWhatsAppProps) {
  const [customers, setCustomers] = useState<Profile[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [message, setMessage] = useState("")
  const [campaignName, setCampaignName] = useState("")
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [sending, setSending] = useState(false)
  const [sendProgress, setSendProgress] = useState({ current: 0, total: 0 })
  const [sendResults, setSendResults] = useState<SendResult[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [filterSegment, setFilterSegment] = useState<string>("all")
  const [showFilters, setShowFilters] = useState(false)
  
  // WhatsApp connection
  const [waConnected, setWaConnected] = useState(false)
  const [waChecking, setWaChecking] = useState(true)
  const [useDirectSend, setUseDirectSend] = useState(true)
  
  // AI Personalization
  const [aiPersonalize, setAiPersonalize] = useState(false)
  const [personalizedMessages, setPersonalizedMessages] = useState<Map<string, string>>(new Map())
  const [generatingPersonalized, setGeneratingPersonalized] = useState(false)
  
  const supabase = createClient()

  // Check WhatsApp connection status
  const checkWaStatus = useCallback(async () => {
    setWaChecking(true)
    try {
      const response = await fetch("/api/whatsapp/status")
      const data = await response.json()
      setWaConnected(data.connected === true)
    } catch {
      setWaConnected(false)
    } finally {
      setWaChecking(false)
    }
  }, [])

  useEffect(() => {
    loadCustomers()
    checkWaStatus()
    
    // Poll status every 5 seconds
    const interval = setInterval(checkWaStatus, 5000)
    return () => clearInterval(interval)
  }, [checkWaStatus])

  const loadCustomers = async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "customer")
        .order("created_at", { ascending: false })
      
      if (data) setCustomers(data)
    } catch (err) {
      toast.error("Failed to load customers")
    } finally {
      setLoading(false)
    }
  }

  const filteredCustomers = customers.filter(c => {
    const matchesSearch = !searchQuery || 
      c.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone?.includes(searchQuery) ||
      c.email?.toLowerCase().includes(searchQuery.toLowerCase())

    let matchesSegment = true
    if (filterSegment === "active") {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      matchesSegment = c.last_visit ? new Date(c.last_visit) > thirtyDaysAgo : false
    } else if (filterSegment === "dormant") {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      matchesSegment = !c.last_visit || new Date(c.last_visit) <= thirtyDaysAgo
    } else if (filterSegment === "vip") {
      matchesSegment = (c.total_spent || 0) >= 1000
    } else if (filterSegment === "new") {
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      matchesSegment = new Date(c.created_at) > sevenDaysAgo
    }

    return matchesSearch && matchesSegment
  })

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedIds(newSet)
  }

  const selectAll = () => {
    if (selectedIds.size === filteredCustomers.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredCustomers.map(c => c.id)))
    }
  }

  // Generate base message with AI
  const generateWithAI = async () => {
    if (!campaignName) {
      toast.error("Please enter campaign goal")
      return
    }

    setGenerating(true)
    try {
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          goal: campaignName,
          targetCount: selectedIds.size || filteredCustomers.length 
        })
      })

      const data = await response.json()
      
      if (data.generatedContent) {
        setMessage(data.generatedContent)
        toast.success("AI message generated")
      } else {
        toast.error("Generation failed, please try again")
      }
    } catch (err) {
      toast.error("Generation failed")
    } finally {
      setGenerating(false)
    }
  }

  // Generate personalized messages for each customer
  const generatePersonalizedMessages = async () => {
    const selectedCustomers = customers.filter(c => selectedIds.has(c.id) && c.phone)
    
    if (selectedCustomers.length === 0) {
      toast.error("Please select customers first")
      return
    }

    if (!campaignName) {
      toast.error("Please enter campaign goal")
      return
    }

    setGeneratingPersonalized(true)
    const newMessages = new Map<string, string>()

    try {
      for (const customer of selectedCustomers) {
        const customerData = {
          name: customer.full_name || "Customer",
          points: customer.points_balance || 0,
          totalSpent: customer.total_spent || 0,
          lastVisit: customer.last_visit,
          visitCount: customer.visit_count || 0
        }

        const response = await fetch("/api/ai/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            goal: campaignName,
            customerData,
            personalized: true
          })
        })

        const data = await response.json()
        
        if (data.generatedContent) {
          newMessages.set(customer.id, data.generatedContent)
        } else {
          // Fallback to template replacement
          const fallbackMsg = message
            .replace(/\{\{name\}\}/g, customer.full_name || "Customer")
            .replace(/\{\{points\}\}/g, String(customer.points_balance || 0))
          newMessages.set(customer.id, fallbackMsg)
        }
      }

      setPersonalizedMessages(newMessages)
      toast.success(`Generated personalized messages for ${newMessages.size} customers`)
    } catch (err) {
      toast.error("Failed to generate personalized messages")
    } finally {
      setGeneratingPersonalized(false)
    }
  }

  const formatPhoneForWhatsApp = (phone: string | null): string => {
    if (!phone) return ""
    let cleaned = phone.replace(/\D/g, "")
    if (cleaned.startsWith("0")) {
      cleaned = "60" + cleaned.substring(1)
    }
    if (!cleaned.startsWith("60") && cleaned.length <= 10) {
      cleaned = "60" + cleaned
    }
    return cleaned
  }

  const copyMessage = async () => {
    const { copyToClipboard } = await import("@/lib/utils")
    await copyToClipboard(message)
    toast.success("Message copied")
  }

  // Get message for a customer (personalized or template)
  const getMessageForCustomer = (customer: Profile): string => {
    if (aiPersonalize && personalizedMessages.has(customer.id)) {
      return personalizedMessages.get(customer.id) || ""
    }
    
    return message
      .replace(/\{\{name\}\}/g, customer.full_name || "Customer")
      .replace(/\{\{points\}\}/g, String(customer.points_balance || 0))
  }

  // Direct send via WhatsApp service
  const sendDirect = async () => {
    const selectedCustomers = customers.filter(c => selectedIds.has(c.id) && c.phone)
    
    if (selectedCustomers.length === 0) {
      toast.error("Please select customers with phone numbers")
      return
    }

    if (!message.trim() && !aiPersonalize) {
      toast.error("Please enter message content")
      return
    }

    setSending(true)
    setSendProgress({ current: 0, total: selectedCustomers.length })
    setSendResults([])

    try {
      // Save campaign
      const { data: campaign } = await supabase
        .from("ai_campaigns")
        .insert({
          name: campaignName || "Bulk Send",
          goal: campaignName || "Bulk Promotion",
          message_template: message,
          recipients_count: selectedCustomers.length,
          sent_count: 0,
          status: "sending"
        })
        .select()
        .single()

      // Prepare messages
      const messages = selectedCustomers.map(customer => ({
        phone: customer.phone!,
        message: getMessageForCustomer(customer),
        customerId: customer.id
      }))

      // Send via WhatsApp service
      const response = await fetch("/api/whatsapp/bulk-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages, delayMs: 3000 })
      })

      const result = await response.json()

      if (result.error) {
        throw new Error(result.error)
      }

      // Process results
      const results: SendResult[] = result.results?.map((r: any) => {
        const customer = selectedCustomers.find(c => c.id === r.customerId)
        return {
          customerId: r.customerId,
          customerName: customer?.full_name || "Unknown",
          phone: r.phone,
          success: r.success,
          error: r.error
        }
      }) || []

      setSendResults(results)
      setSendProgress({ current: result.total, total: result.total })

      // Save sent messages to database
      for (const customer of selectedCustomers) {
        const sendResult = results.find(r => r.customerId === customer.id)
        await supabase.from("sent_messages").insert({
          customer_id: customer.id,
          message_type: "promotion",
          message_content: getMessageForCustomer(customer),
          channel: "whatsapp",
          status: sendResult?.success ? "sent" : "failed",
          campaign_id: campaign?.id
        })
      }

      // Update campaign
      if (campaign) {
        await supabase
          .from("ai_campaigns")
          .update({ 
            sent_count: result.success, 
            status: "completed",
            completed_at: new Date().toISOString()
          })
          .eq("id", campaign.id)
      }

      toast.success(`Send complete: ${result.success} success, ${result.failed} failed`)
      setSelectedIds(new Set())
    } catch (err: any) {
      toast.error(err.message || "Send failed")
    } finally {
      setSending(false)
    }
  }

  // Fallback: open wa.me links
  const sendViaLinks = async () => {
    const selectedCustomers = customers.filter(c => selectedIds.has(c.id) && c.phone)
    
    if (selectedCustomers.length === 0) {
      toast.error("Please select customers with phone numbers")
      return
    }

    if (!message.trim()) {
      toast.error("Please enter message content")
      return
    }

    setSending(true)
    setSendProgress({ current: 0, total: selectedCustomers.length })

    try {
      const { data: campaign } = await supabase
        .from("ai_campaigns")
        .insert({
          name: campaignName || "Bulk Send",
          goal: campaignName || "Bulk Promotion",
          message_template: message,
          recipients_count: selectedCustomers.length,
          sent_count: 0,
          status: "sending"
        })
        .select()
        .single()

      for (let i = 0; i < selectedCustomers.length; i++) {
        const customer = selectedCustomers[i]
        const phone = formatPhoneForWhatsApp(customer.phone)
        const personalizedMessage = getMessageForCustomer(customer)
        const encodedMessage = encodeURIComponent(personalizedMessage)
        const waUrl = `https://wa.me/${phone}?text=${encodedMessage}`

        await supabase.from("sent_messages").insert({
          customer_id: customer.id,
          message_type: "promotion",
          message_content: personalizedMessage,
          channel: "whatsapp",
          status: "sent",
          campaign_id: campaign?.id
        })

        if (i === 0) {
          window.open(waUrl, "_blank")
        } else {
          toast.info(`Ready to send to ${customer.full_name}`, {
            action: {
              label: "Open WhatsApp",
              onClick: () => window.open(waUrl, "_blank")
            }
          })
        }

        setSendProgress({ current: i + 1, total: selectedCustomers.length })
        await new Promise(resolve => setTimeout(resolve, 500))
      }

      if (campaign) {
        await supabase
          .from("ai_campaigns")
          .update({ 
            sent_count: selectedCustomers.length, 
            status: "completed",
            completed_at: new Date().toISOString()
          })
          .eq("id", campaign.id)
      }

      toast.success(`Ready to send to ${selectedCustomers.length} customers`)
      setSelectedIds(new Set())
    } catch (err) {
      toast.error("Error during sending")
    } finally {
      setSending(false)
    }
  }

  const handleSend = () => {
    if (useDirectSend && waConnected) {
      sendDirect()
    } else {
      sendViaLinks()
    }
  }

  const getInitials = (name: string | null) => {
    if (!name) return "?"
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
  }

  const segmentOptions = [
    { value: "all", label: "All Customers", count: customers.length },
    { value: "active", label: "Active (30 days)", count: customers.filter(c => {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      return c.last_visit ? new Date(c.last_visit) > thirtyDaysAgo : false
    }).length },
    { value: "dormant", label: "Dormant (30+ days)", count: customers.filter(c => {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      return !c.last_visit || new Date(c.last_visit) <= thirtyDaysAgo
    }).length },
    { value: "vip", label: "VIP (spent ≥RM1000)", count: customers.filter(c => (c.total_spent || 0) >= 1000).length },
    { value: "new", label: "New (7 days)", count: customers.filter(c => {
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      return new Date(c.created_at) > sevenDaysAgo
    }).length }
  ]

  return (
    <div className="space-y-6">
      {/* WhatsApp Connection Status */}
      <WhatsAppConnection />

      {/* Send Mode Selection */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {waConnected ? (
                <Wifi className="w-5 h-5 text-green-500" />
              ) : (
                <WifiOff className="w-5 h-5 text-muted-foreground" />
              )}
              <div>
                <p className="font-medium">Send Mode</p>
                <p className="text-sm text-muted-foreground">
                  {useDirectSend && waConnected 
                    ? "Auto Send (via WhatsApp Service)" 
                    : "Manual Send (open wa.me links)"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="direct-send" className="text-sm">Auto Send</Label>
              <Switch
                id="direct-send"
                checked={useDirectSend}
                onCheckedChange={setUseDirectSend}
                disabled={!waConnected}
              />
            </div>
          </div>
          {!waConnected && useDirectSend && (
            <p className="text-sm text-amber-600 mt-2">
              WhatsApp not connected. Please scan QR code first, or use manual send mode
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 左侧：客户选择 */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-500" />
              Select Customers
            </CardTitle>
            <CardDescription>
              Select customers to send messages to
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 搜索和过滤 */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search customers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowFilters(!showFilters)}
              >
                {showFilters ? <ChevronUp className="w-4 h-4" /> : <Filter className="w-4 h-4" />}
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={loadCustomers}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>

            {/* 分群过滤器 */}
            {showFilters && (
              <div className="flex flex-wrap gap-2 p-3 bg-muted/30 rounded-lg">
                {segmentOptions.map(option => (
                  <Button
                    key={option.value}
                    variant={filterSegment === option.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterSegment(option.value)}
                    className="gap-1"
                  >
                    {option.label}
                    <Badge variant="secondary" className="ml-1">
                      {option.count}
                    </Badge>
                  </Button>
                ))}
              </div>
            )}

            {/* 全选 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedIds.size === filteredCustomers.length && filteredCustomers.length > 0}
                  onCheckedChange={selectAll}
                />
                <Label>Select All</Label>
              </div>
              <Badge variant="outline">
                Selected {selectedIds.size} / {filteredCustomers.length}
              </Badge>
            </div>

            {/* 客户列表 */}
            <ScrollArea className="h-[300px] border rounded-lg">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredCustomers.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <Users className="w-12 h-12 mb-2 opacity-50" />
                  <p>No customers found</p>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {filteredCustomers.map(customer => (
                    <div
                      key={customer.id}
                      onClick={() => toggleSelect(customer.id)}
                      className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                        selectedIds.has(customer.id) 
                          ? "bg-primary/10 border border-primary/30" 
                          : "hover:bg-muted/50"
                      }`}
                    >
                      <Checkbox checked={selectedIds.has(customer.id)} />
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="text-xs">
                          {getInitials(customer.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {customer.full_name || "Unknown"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {customer.phone || "No phone"}
                        </p>
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        <p>{customer.points_balance || 0} pts</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* 右侧：消息编辑 */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-amber-500" />
              Compose Message
            </CardTitle>
            <CardDescription>
              Write or let AI generate marketing messages
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 活动名称 */}
            <div>
              <Label>Campaign Goal</Label>
              <Input
                placeholder="e.g., Win back dormant customers, double points event..."
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                className="mt-1"
              />
            </div>

            {/* AI 生成按钮 */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={generateWithAI}
                disabled={generating || !campaignName}
                className="flex-1 gap-2"
              >
                {generating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                AI Generate Message
              </Button>
            </div>

            {/* AI 个性化开关 */}
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-purple-500" />
                <div>
                  <p className="text-sm font-medium">AI Personalized Messages</p>
                  <p className="text-xs text-muted-foreground">Generate unique messages for each customer</p>
                </div>
              </div>
              <Switch
                checked={aiPersonalize}
                onCheckedChange={setAiPersonalize}
              />
            </div>

            {aiPersonalize && selectedIds.size > 0 && (
              <Button
                variant="secondary"
                onClick={generatePersonalizedMessages}
                disabled={generatingPersonalized || !campaignName}
                className="w-full gap-2"
              >
                {generatingPersonalized ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4" />
                )}
                Generate personalized messages for {selectedIds.size} customers
              </Button>
            )}

            {personalizedMessages.size > 0 && (
              <p className="text-sm text-green-600">
                <CheckCircle2 className="w-4 h-4 inline mr-1" />
                Generated {personalizedMessages.size} personalized messages
              </p>
            )}

            {/* 消息内容 */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label>{aiPersonalize ? "Message Template (Fallback)" : "Message Content"}</Label>
                <Button variant="ghost" size="sm" onClick={copyMessage} className="gap-1">
                  <Copy className="w-3 h-3" />
                  Copy
                </Button>
              </div>
              <Textarea
                placeholder="Enter message content. Use {{name}} to auto-replace customer name..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Supported variables: {"{{name}}"} = Customer Name, {"{{points}}"} = Points Balance
              </p>
            </div>

            {/* 发送进度 */}
            {sending && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Send Progress</span>
                  <span>{sendProgress.current} / {sendProgress.total}</span>
                </div>
                <Progress value={(sendProgress.current / sendProgress.total) * 100} />
              </div>
            )}

            {/* 发送结果 */}
            {sendResults.length > 0 && (
              <div className="space-y-2">
                <Label>Send Results</Label>
                <ScrollArea className="h-[100px] border rounded-lg p-2">
                  {sendResults.map((result, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm py-1">
                      {result.success ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                      <span>{result.customerName}</span>
                      {result.error && (
                        <span className="text-xs text-muted-foreground">({result.error})</span>
                      )}
                    </div>
                  ))}
                </ScrollArea>
              </div>
            )}

            {/* 发送按钮 */}
            <div className="flex gap-2">
              <Button
                onClick={handleSend}
                disabled={sending || selectedIds.size === 0 || (!message.trim() && !aiPersonalize)}
                className="flex-1 gap-2"
              >
                {sending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending ({sendProgress.current}/{sendProgress.total})
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    {useDirectSend && waConnected ? "Auto Send" : "Manual Send"} {selectedIds.size} customers
                  </>
                )}
              </Button>
            </div>

            {/* 测试发送 */}
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-2">Test Send</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const phone = formatPhoneForWhatsApp(testPhone)
                  const encodedMessage = encodeURIComponent(message || "Test message")
                  window.open(`https://wa.me/${phone}?text=${encodedMessage}`, "_blank")
                }}
                disabled={!message.trim()}
                className="gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Send to test number ({testPhone})
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
