"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  Send, 
  Users, 
  Loader2,
  CheckCircle2,
  Search,
  Sparkles,
  User,
  Gift,
  MessageSquare,
  TrendingUp,
  Calendar,
  Coins,
  ShoppingBag,
  ChevronRight,
  Copy,
  Ticket
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import type { Profile } from "@/lib/supabase/types"

interface CustomerAnalysis {
  totalSpent: number
  visitCount: number
  lastVisit: string | null
  pointsBalance: number
  daysSinceLastVisit: number
  isVip: boolean
  isAtRisk: boolean
  hasBirthday: boolean
  vouchersUsed: number
  avgSpend: number
  membershipTier: string
}

interface SelectedCustomer {
  profile: Profile
  analysis: CustomerAnalysis | null
  message: string
  sent: boolean
}

export function AIMarketingHub() {
  const [customers, setCustomers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCustomers, setSelectedCustomers] = useState<SelectedCustomer[]>([])
  const [analyzing, setAnalyzing] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [currentStep, setCurrentStep] = useState<"select" | "analyze" | "message" | "send">("select")
  
  // Voucher creation
  const [createVoucher, setCreateVoucher] = useState(false)
  const [voucherName, setVoucherName] = useState("")
  const [voucherDiscount, setVoucherDiscount] = useState("10")
  const [voucherType, setVoucherType] = useState<"percentage" | "fixed">("percentage")
  
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
        .order("full_name")

      if (data) setCustomers(data)
    } catch (err) {
      console.error("Load error:", err)
    } finally {
      setLoading(false)
    }
  }

  // Filter customers
  const filteredCustomers = customers.filter(c => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return c.full_name?.toLowerCase().includes(q) || c.phone?.includes(q)
  })

  // Toggle customer selection
  const toggleCustomer = (customer: Profile) => {
    const exists = selectedCustomers.find(sc => sc.profile.id === customer.id)
    if (exists) {
      setSelectedCustomers(prev => prev.filter(sc => sc.profile.id !== customer.id))
    } else {
      setSelectedCustomers(prev => [...prev, {
        profile: customer,
        analysis: null,
        message: "",
        sent: false
      }])
    }
  }

  // Select all filtered
  const selectAll = () => {
    const newSelected = filteredCustomers.map(c => ({
      profile: c,
      analysis: null,
      message: "",
      sent: false
    }))
    setSelectedCustomers(newSelected)
  }

  // Clear selection
  const clearSelection = () => {
    setSelectedCustomers([])
    setCurrentStep("select")
  }

  // Analyze selected customers
  const analyzeCustomers = async () => {
    setAnalyzing(true)
    setCurrentStep("analyze")

    try {
      const today = new Date()
      const updated = await Promise.all(selectedCustomers.map(async (sc) => {
        const { profile } = sc
        
        // Get transactions
        const { data: transactions } = await supabase
          .from("transactions")
          .select("*")
          .eq("user_id", profile.id)
          .order("created_at", { ascending: false })
        
        // Get used vouchers
        const { data: usedVouchers } = await supabase
          .from("user_vouchers")
          .select("*")
          .eq("user_id", profile.id)
        
        // Calculate analysis
        const totalSpent = profile.total_spent || 0
        const visitCount = profile.visit_count || 0
        const lastVisit = profile.last_visit
        const daysSinceLastVisit = lastVisit 
          ? Math.floor((today.getTime() - new Date(lastVisit).getTime()) / (1000 * 60 * 60 * 24))
          : 999
        
        // Check birthday
        let hasBirthday = false
        if (profile.birthday) {
          const bday = new Date(profile.birthday)
          const thisYearBday = new Date(today.getFullYear(), bday.getMonth(), bday.getDate())
          const diff = (thisYearBday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
          hasBirthday = diff >= -1 && diff <= 7
        }
        
        // Membership tier
        let membershipTier = "Bronze"
        if (totalSpent >= 5000) membershipTier = "Diamond"
        else if (totalSpent >= 3000) membershipTier = "Gold"
        else if (totalSpent >= 1000) membershipTier = "Silver"
        
        const analysis: CustomerAnalysis = {
          totalSpent,
          visitCount,
          lastVisit,
          pointsBalance: profile.points_balance || 0,
          daysSinceLastVisit,
          isVip: totalSpent >= 1000,
          isAtRisk: daysSinceLastVisit > 30,
          hasBirthday,
          vouchersUsed: usedVouchers?.length || 0,
          avgSpend: visitCount > 0 ? totalSpent / visitCount : 0,
          membershipTier
        }
        
        return { ...sc, analysis }
      }))
      
      setSelectedCustomers(updated)
      toast.success(`已分析 ${updated.length} 位客户`)
    } catch (err) {
      console.error("Analysis error:", err)
      toast.error("分析失败")
    } finally {
      setAnalyzing(false)
    }
  }

  // Generate personalized messages with AI
  const generateMessages = async () => {
    setGenerating(true)
    setCurrentStep("message")

    try {
      const updated = await Promise.all(selectedCustomers.map(async (sc) => {
        const { profile, analysis } = sc
        
        let message = ""
        
        // Generate based on customer status
        if (analysis?.hasBirthday) {
          message = `🎂 ${profile.full_name}，生日快乐！

感谢你成为 JP&Co 的忠实会员！🎉

为了庆祝你的特别日子，我们送你：
🎁 生日专属优惠券（本周有效）

快来店里享用美食吧！我们等着为你庆祝～

- JP&Co 团队 ❤️`
        } else if (analysis?.isAtRisk) {
          message = `🍔 Hey ${profile.full_name}！

好久不见！已经 ${analysis.daysSinceLastVisit} 天没看到你了，想你了～ 😊

特别为你准备了回归优惠：
✨ 消费满 RM30 送免费饮料！

你还有 ${analysis.pointsBalance} 积分可以用哦！

快来 JP&Co 叙叙旧吧！

- JP&Co 团队 🍟`
        } else if (analysis?.isVip) {
          message = `⭐ 尊贵的 ${profile.full_name}，

感谢你一直以来的支持！你是我们的 ${analysis.membershipTier} 会员 💎

作为 VIP 专属福利：
🎁 本周消费可享双倍积分！

你目前有 ${analysis.pointsBalance} 积分，继续累积换好礼！

期待你的光临！

- JP&Co VIP 服务 ⭐`
        } else {
          message = `🍔 Hi ${profile.full_name}！

JP&Co 想念你了！☺️

本周特惠来啦：
✨ 全场消费满 RM50 减 RM5！

你还有 ${analysis?.pointsBalance || 0} 积分可以用哦～

快来吃好吃的吧！

- JP&Co 团队 🍟`
        }
        
        return { ...sc, message }
      }))
      
      setSelectedCustomers(updated)
      toast.success("消息已生成")
    } catch (err) {
      console.error("Generate error:", err)
      toast.error("生成失败")
    } finally {
      setGenerating(false)
    }
  }

  // Create personal voucher for selected customers
  const createPersonalVoucher = async () => {
    if (!voucherName.trim()) {
      toast.error("请输入优惠券名称")
      return
    }

    try {
      // Create vouchers for each selected customer
      for (const sc of selectedCustomers) {
        // Generate unique code: Name prefix + random + timestamp
        const code = `${voucherName.substring(0, 3).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}${Date.now().toString(36).toUpperCase()}`
        
        // Create the voucher template
        const { data: voucher, error: voucherError } = await supabase
          .from("vouchers")
          .insert({
            code,
            name: voucherName,
            description: `${sc.profile.full_name} 专属优惠`,
            discount_type: voucherType,
            discount_value: parseFloat(voucherDiscount),
            valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            is_active: true,
            voucher_type: "personal",
            target_customer_id: sc.profile.id,
            created_by_ai: true,
            ai_reason: "AI Marketing Hub 创建"
          })
          .select()
          .single()
        
        if (voucherError) throw voucherError
        
        // Also add to user_vouchers so customer can see it
        await supabase.from("user_vouchers").insert({
          user_id: sc.profile.id,
          voucher_id: voucher.id,
          code: code, // Same unique code
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          is_used: false
        })

        // Send notification to admin
        try {
          await supabase.from("admin_notifications").insert({
            type: "system_alert",
            title: "专属优惠券已创建",
            message: `为 ${sc.profile.full_name} 创建了专属优惠券「${voucherName}」，代码: ${code}`,
            severity: "info",
            related_user_id: sc.profile.id,
            metadata: {
              voucher_code: code,
              voucher_name: voucherName,
              customer_name: sc.profile.full_name,
              discount: `${voucherDiscount}${voucherType === "percentage" ? "%" : "RM"}`
            }
          })
        } catch (e) {}
      }
      
      toast.success(`已为 ${selectedCustomers.length} 位客户创建专属优惠券`)
      setCreateVoucher(false)
      setVoucherName("")
    } catch (err) {
      console.error("Voucher error:", err)
      toast.error("创建优惠券失败")
    }
  }

  // Format phone for WhatsApp
  const formatPhone = (phone: string | null): string => {
    if (!phone) return ""
    const clean = phone.replace(/\D/g, '')
    if (clean.startsWith("60")) return clean
    if (clean.startsWith("0")) return "60" + clean.substring(1)
    return "60" + clean
  }

  // Send WhatsApp to customer
  const sendToCustomer = async (index: number) => {
    const sc = selectedCustomers[index]
    if (!sc || sc.sent) return

    const phone = formatPhone(sc.profile.phone)
    const encodedMessage = encodeURIComponent(sc.message)
    const waUrl = `https://wa.me/${phone}?text=${encodedMessage}`

    window.open(waUrl, "_blank")

    // Mark as sent
    const updated = [...selectedCustomers]
    updated[index].sent = true
    setSelectedCustomers(updated)

    // Record
    try {
      await supabase.from("sent_messages").insert({
        customer_id: sc.profile.id,
        message_type: "ai_personalized",
        message_content: sc.message,
        channel: "whatsapp",
        status: "sent"
      })
    } catch (e) {}

    toast.success(`已发送给 ${sc.profile.full_name}`)
  }

  const sentCount = selectedCustomers.filter(sc => sc.sent).length

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center justify-between bg-muted/30 rounded-lg p-4">
        <div className="flex items-center gap-8">
          {["select", "analyze", "message", "send"].map((step, i) => (
            <div key={step} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep === step 
                  ? "bg-primary text-primary-foreground" 
                  : i < ["select", "analyze", "message", "send"].indexOf(currentStep)
                    ? "bg-green-500 text-white"
                    : "bg-muted text-muted-foreground"
              }`}>
                {i < ["select", "analyze", "message", "send"].indexOf(currentStep) ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  i + 1
                )}
              </div>
              <span className={`text-sm ${currentStep === step ? "font-medium" : "text-muted-foreground"}`}>
                {step === "select" ? "选择客户" : 
                 step === "analyze" ? "AI 分析" : 
                 step === "message" ? "生成消息" : "发送"}
              </span>
            </div>
          ))}
        </div>
        <Badge variant="outline">
          已选 {selectedCustomers.length} 人
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Customer Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              选择客户
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="搜索名字或手机号..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={selectAll}>
                全选 ({filteredCustomers.length})
              </Button>
              <Button variant="outline" size="sm" onClick={clearSelection}>
                清空
              </Button>
            </div>

            {/* Customer List */}
            <ScrollArea className="h-[300px]">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredCustomers.map(customer => {
                    const isSelected = selectedCustomers.some(sc => sc.profile.id === customer.id)
                    const sc = selectedCustomers.find(s => s.profile.id === customer.id)
                    
                    return (
                      <div
                        key={customer.id}
                        onClick={() => toggleCustomer(customer)}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          isSelected 
                            ? "bg-primary/10 border-primary/30" 
                            : "bg-card border-border hover:bg-muted/50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox checked={isSelected} />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{customer.full_name || "未知"}</span>
                              {(customer.total_spent || 0) >= 1000 && (
                                <Badge variant="secondary" className="text-xs">VIP</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                              <span>{customer.phone || "无电话"}</span>
                              <span>•</span>
                              <span>{customer.points_balance || 0} 积分</span>
                            </div>
                          </div>
                          {sc?.sent && (
                            <Badge className="bg-green-500">已发送</Badge>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </ScrollArea>

            {/* Analyze Button */}
            {selectedCustomers.length > 0 && currentStep === "select" && (
              <Button 
                onClick={analyzeCustomers} 
                className="w-full gap-2"
                disabled={analyzing}
              >
                {analyzing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                AI 分析选中客户 ({selectedCustomers.length})
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Right: Analysis & Messages */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {currentStep === "select" ? (
                <>
                  <User className="w-5 h-5" />
                  客户详情
                </>
              ) : currentStep === "analyze" ? (
                <>
                  <TrendingUp className="w-5 h-5" />
                  AI 分析结果
                </>
              ) : (
                <>
                  <MessageSquare className="w-5 h-5" />
                  发送消息
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedCustomers.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>选择客户开始</p>
                <p className="text-sm mt-2">可以选择单个或多个客户</p>
              </div>
            ) : currentStep === "select" ? (
              <div className="space-y-4">
                <p className="text-muted-foreground text-sm">
                  已选择 {selectedCustomers.length} 位客户，点击"AI 分析"查看详细信息
                </p>
                {selectedCustomers.slice(0, 5).map(sc => (
                  <div key={sc.profile.id} className="p-3 rounded-lg bg-muted/30">
                    <span className="font-medium">{sc.profile.full_name}</span>
                  </div>
                ))}
                {selectedCustomers.length > 5 && (
                  <p className="text-sm text-muted-foreground">
                    还有 {selectedCustomers.length - 5} 位...
                  </p>
                )}
              </div>
            ) : currentStep === "analyze" ? (
              <div className="space-y-4">
                <ScrollArea className="h-[250px]">
                  {selectedCustomers.map(sc => (
                    <div key={sc.profile.id} className="p-3 rounded-lg bg-muted/30 mb-2">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{sc.profile.full_name}</span>
                        <Badge>{sc.analysis?.membershipTier}</Badge>
                      </div>
                      {sc.analysis && (
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="flex items-center gap-1">
                            <Coins className="w-3 h-3" />
                            <span>{sc.analysis.pointsBalance} 积分</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <ShoppingBag className="w-3 h-3" />
                            <span>RM{sc.analysis.totalSpent.toFixed(0)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>{sc.analysis.daysSinceLastVisit}天前</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Ticket className="w-3 h-3" />
                            <span>用过{sc.analysis.vouchersUsed}张券</span>
                          </div>
                          {sc.analysis.isAtRisk && <Badge variant="destructive" className="text-xs">流失风险</Badge>}
                          {sc.analysis.hasBirthday && <Badge className="bg-pink-500 text-xs">生日</Badge>}
                        </div>
                      )}
                    </div>
                  ))}
                </ScrollArea>

                {/* Create Voucher Option */}
                <div className="border-t pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Checkbox 
                      checked={createVoucher} 
                      onCheckedChange={(c) => setCreateVoucher(c === true)}
                    />
                    <span className="text-sm">为选中客户创建专属优惠券</span>
                  </div>
                  
                  {createVoucher && (
                    <div className="space-y-3 pl-6">
                      <Input
                        placeholder="优惠券名称（如：VIP专属）"
                        value={voucherName}
                        onChange={(e) => setVoucherName(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <select 
                          className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                          value={voucherType}
                          onChange={(e) => setVoucherType(e.target.value as any)}
                        >
                          <option value="percentage">百分比折扣</option>
                          <option value="fixed">固定金额</option>
                        </select>
                        <Input
                          type="number"
                          placeholder="折扣值"
                          value={voucherDiscount}
                          onChange={(e) => setVoucherDiscount(e.target.value)}
                          className="w-24"
                        />
                        <span className="self-center text-sm text-muted-foreground">
                          {voucherType === "percentage" ? "%" : "RM"}
                        </span>
                      </div>
                      <Button size="sm" onClick={createPersonalVoucher} className="gap-2">
                        <Gift className="w-4 h-4" />
                        创建专属券
                      </Button>
                    </div>
                  )}
                </div>

                <Button onClick={generateMessages} className="w-full gap-2" disabled={generating}>
                  {generating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <MessageSquare className="w-4 h-4" />
                  )}
                  生成个性化消息
                </Button>
              </div>
            ) : (
              /* Send Step */
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span>发送进度</span>
                  <span>{sentCount}/{selectedCustomers.length}</span>
                </div>
                
                <ScrollArea className="h-[300px]">
                  {selectedCustomers.map((sc, index) => (
                    <div 
                      key={sc.profile.id} 
                      className={`p-3 rounded-lg border mb-2 ${
                        sc.sent ? "bg-green-500/10 border-green-500/30" : "bg-card"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{sc.profile.full_name}</span>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              import("@/lib/utils").then(({ copyToClipboard }) => copyToClipboard(sc.message))
                              toast.success("Copied!")
                            }}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => sendToCustomer(index)}
                            disabled={sc.sent}
                            className={sc.sent ? "bg-green-500" : ""}
                          >
                            {sc.sent ? (
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
                      <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded max-h-16 overflow-hidden">
                        {sc.message.substring(0, 80)}...
                      </div>
                    </div>
                  ))}
                </ScrollArea>

                <Button 
                  variant="outline" 
                  onClick={() => {
                    setCurrentStep("select")
                    setSelectedCustomers([])
                  }}
                  className="w-full"
                >
                  完成，开始新一轮
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
