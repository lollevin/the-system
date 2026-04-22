"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Sparkles, 
  User, 
  Gift, 
  TrendingUp, 
  AlertTriangle,
  Cake,
  Clock,
  DollarSign,
  Target,
  Loader2,
  CheckCircle2,
  Send,
  Plus,
  Ticket,
  Users,
  Brain,
  Zap
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { useLanguage } from "@/lib/i18n"
import type { Profile, Voucher } from "@/lib/supabase/types"

interface CustomerAnalysis {
  customer: Profile
  insights: string[]
  recommendedAction: string
  suggestedVoucher: {
    name: string
    discount_type: "percentage" | "fixed"
    discount_value: number
    reason: string
  } | null
  riskLevel: "low" | "medium" | "high"
  potentialValue: number
}

interface AIRecommendation {
  type: "personal" | "global"
  title: string
  description: string
  targetCustomers: Profile[]
  suggestedVoucher: {
    name: string
    code: string
    discount_type: "percentage" | "fixed"
    discount_value: number
    valid_days: number
    points_required: number
  }
  estimatedImpact: string
}

export function SmartAICopilot() {
  const [customers, setCustomers] = useState<Profile[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [vouchers, setVouchers] = useState<Voucher[]>([])
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [creating, setCreating] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Profile | null>(null)
  const [customerAnalysis, setCustomerAnalysis] = useState<CustomerAnalysis | null>(null)
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([])
  const [activeTab, setActiveTab] = useState("overview")
  const [aiRecLoading, setAiRecLoading] = useState(false)
  const [aiRecError, setAiRecError] = useState<string | null>(null)
  const [aiEnhanced, setAiEnhanced] = useState(false)

  const { t, languageRef } = useLanguage()
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      // 加载客户数据
      const { data: customersData } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "customer")
        .order("total_spent", { ascending: false })

      // 加载交易记录
      const { data: transactionsData } = await supabase
        .from("transactions")
        .select("*, customer:user_id(full_name, phone)")
        .order("created_at", { ascending: false })
        .limit(100)

      // 加载优惠券使用记录
      const { data: vouchersData } = await supabase
        .from("vouchers")
        .select("*")
        .order("created_at", { ascending: false })

      if (customersData) setCustomers(customersData)
      if (transactionsData) setTransactions(transactionsData)
      if (vouchersData) setVouchers(vouchersData)

      // 自动生成建议 - First use rule-based as fallback, then try AI
      if (customersData && customersData.length > 0) {
        generateRecommendations(customersData, transactionsData || [])
        // Then try AI-powered recommendations (replaces rule-based if successful)
        fetchAIRecommendations(customersData)
      }
    } catch (err) {
      console.error("Error loading data:", err)
    } finally {
      setLoading(false)
    }
  }

  const fetchAIRecommendations = async (customersData: Profile[]) => {
    setAiRecLoading(true)
    setAiRecError(null)
    try {
      // Snapshot the locale at FETCH time so async completion
      // never rehydrates state with stale-language content.
      const localeAtFetch = languageRef.current
      const res = await fetch(`/api/ai/recommendations?locale=${encodeURIComponent(localeAtFetch)}`, {
        headers: { "X-Locale": localeAtFetch },
        cache: "no-store",
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch AI recommendations")
      }

      if (data.aiError) {
        setAiRecError(data.aiError)
        setAiEnhanced(false)
        return
      }

      if (data.recommendations && data.recommendations.length > 0) {
        const aiRecs: AIRecommendation[] = data.recommendations.map((r: any) => ({
          type: r.type || "global",
          title: r.title,
          description: r.description + (r.reasoning ? `\n\n💡 ${r.reasoning}` : ""),
          targetCustomers: r.targetCustomers || [],
          suggestedVoucher: r.suggestedVoucher,
          estimatedImpact: r.estimatedImpact,
        }))
        setRecommendations(aiRecs)
        setAiEnhanced(true)
      }
    } catch (err: any) {
      setAiRecError(err.message || "AI unavailable, showing rule-based recommendations")
      setAiEnhanced(false)
    } finally {
      setAiRecLoading(false)
    }
  }

  const refreshAIRecommendations = async () => {
    if (customers.length > 0) {
      await fetchAIRecommendations(customers)
      toast.success(aiEnhanced ? t("ai", "aiRecsRefreshed") : t("ai", "usingRuleFallback"))
    }
  }

  const analyzeCustomer = async (customer: Profile) => {
    setSelectedCustomer(customer)
    setAnalyzing(true)

    try {
      // 获取客户的交易记录
      const { data: customerTransactions } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", customer.id)
        .order("created_at", { ascending: false })

      // 获取客户使用过的优惠券
      const { data: usedVouchers } = await supabase
        .from("user_vouchers")
        .select("*, voucher:voucher_id(*)")
        .eq("user_id", customer.id)

      // 分析客户
      const analysis = generateCustomerAnalysis(customer, customerTransactions || [], usedVouchers || [])
      setCustomerAnalysis(analysis)
    } catch (err) {
      console.error("Analysis error:", err)
      toast.error(t("ai", "scAnalysisFailed"))
    } finally {
      setAnalyzing(false)
    }
  }

  const generateCustomerAnalysis = (
    customer: Profile, 
    transactions: any[], 
    usedVouchers: any[]
  ): CustomerAnalysis => {
    const insights: string[] = []
    let riskLevel: "low" | "medium" | "high" = "low"
    let suggestedVoucher = null

    const totalSpent = customer.total_spent || 0
    if (totalSpent >= 1000) {
      insights.push(`🌟 ${t("ai", "scVipCustomer")}${totalSpent.toFixed(0)}`)
    } else if (totalSpent >= 500) {
      insights.push(`💎 ${t("ai", "scPremiumCustomer")}${totalSpent.toFixed(0)}`)
    } else {
      insights.push(`📊 ${t("ai", "scRegularCustomer")}${totalSpent.toFixed(0)}`)
    }

    const visitCount = customer.visit_count || 0
    if (visitCount >= 10) {
      insights.push(`🔄 ${t("ai", "scHighFreq")} ${visitCount} ${t("ai", "scTimesVisit")}`)
    } else if (visitCount >= 5) {
      insights.push(`📈 ${t("ai", "scActiveFreq")} ${visitCount} ${t("ai", "scTimesVisit")}`)
    } else {
      insights.push(`📉 ${t("ai", "scLowFreq")} ${visitCount} ${t("ai", "scTimesVisit")}`)
    }

    if (customer.last_visit) {
      const daysSinceVisit = Math.floor(
        (Date.now() - new Date(customer.last_visit).getTime()) / (1000 * 60 * 60 * 24)
      )
      if (daysSinceVisit > 60) {
        insights.push(`⚠️ ${t("ai", "scHighChurnRisk")} ${daysSinceVisit} ${t("ai", "scDaysNoVisit")}`)
        riskLevel = "high"
      } else if (daysSinceVisit > 30) {
        insights.push(`⏰ ${t("ai", "scChurnWarning")} ${daysSinceVisit} ${t("ai", "scDaysNoVisit")}`)
        riskLevel = "medium"
      } else {
        insights.push(`✅ ${t("ai", "scRecentlyActive")} ${daysSinceVisit} ${t("ai", "scDaysAgoVisit")}`)
      }
    } else {
      insights.push(`🆕 ${t("ai", "scNewCustomerNoVisit")}`)
      riskLevel = "medium"
    }

    if (customer.birthday) {
      const bday = new Date(customer.birthday)
      const today = new Date()
      const daysUntilBirthday = calculateDaysUntilBirthday(bday, today)
      if (daysUntilBirthday === 0) {
        insights.push(`🎂 ${t("ai", "scBirthdayToday")}`)
      } else if (daysUntilBirthday <= 7) {
        insights.push(`🎁 ${t("ai", "scBirthdaySoon")} ${daysUntilBirthday} ${t("ai", "scDaysLater")}`)
      }
    } else {
      insights.push(`📝 ${t("ai", "scNoBirthday")}`)
    }

    if (usedVouchers.length > 0) {
      const usedCount = usedVouchers.filter(v => v.is_used).length
      insights.push(`🎫 ${t("ai", "scUsedVouchers")} ${usedCount}`)
    }

    if (riskLevel === "high") {
      suggestedVoucher = {
        name: `${customer.full_name || t("ai", "scCustomerFallback")} ${t("ai", "scComebackGift")}`,
        discount_type: "percentage" as const,
        discount_value: 20,
        reason: t("ai", "scComebackReason")
      }
    } else if (customer.birthday) {
      const daysUntil = calculateDaysUntilBirthday(new Date(customer.birthday), new Date())
      if (daysUntil <= 7 && daysUntil >= 0) {
        suggestedVoucher = {
          name: `${customer.full_name || t("ai", "scCustomerFallback")} ${t("ai", "scBirthdaySpecial")}`,
          discount_type: "fixed" as const,
          discount_value: 15,
          reason: t("ai", "scBirthdayReason")
        }
      }
    } else if (totalSpent >= 1000 && visitCount < 5) {
      suggestedVoucher = {
        name: t("ai", "scVipExclusive"),
        discount_type: "percentage" as const,
        discount_value: 15,
        reason: t("ai", "scVipReason")
      }
    }

    let recommendedAction = ""
    if (riskLevel === "high") {
      recommendedAction = t("ai", "scActionHigh")
    } else if (riskLevel === "medium") {
      recommendedAction = t("ai", "scActionMedium")
    } else if (suggestedVoucher) {
      recommendedAction = t("ai", "scActionVoucher")
    } else {
      recommendedAction = t("ai", "scActionDefault")
    }

    return {
      customer,
      insights,
      recommendedAction,
      suggestedVoucher,
      riskLevel,
      potentialValue: totalSpent * 1.5
    }
  }

  const calculateDaysUntilBirthday = (birthday: Date, today: Date): number => {
    const thisYearBirthday = new Date(today.getFullYear(), birthday.getMonth(), birthday.getDate())
    if (thisYearBirthday < today) {
      thisYearBirthday.setFullYear(today.getFullYear() + 1)
    }
    return Math.floor((thisYearBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  }

  const generateRecommendations = (customers: Profile[], transactions: any[]) => {
    const recs: AIRecommendation[] = []

    const today = new Date()
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
    const dormantCustomers = customers.filter(c => 
      !c.last_visit || new Date(c.last_visit) < thirtyDaysAgo
    )

    if (dormantCustomers.length > 0) {
      recs.push({
        type: "global",
        title: t("ai", "scRecWakeDormant"),
        description: `${dormantCustomers.length} ${t("ai", "scRecWakeDormantDesc")}`,
        targetCustomers: dormantCustomers.slice(0, 5),
        suggestedVoucher: {
          name: t("ai", "scRecComebackOffer"),
          code: `COMEBACK${Date.now().toString().slice(-4)}`,
          discount_type: "percentage",
          discount_value: 15,
          valid_days: 14,
          points_required: 0
        },
        estimatedImpact: `${t("ai", "scRecWakeImpact")} ${Math.round(dormantCustomers.length * 0.3)} ${t("ai", "scRecCustomers")}`
      })
    }

    const upcomingBirthdays = customers.filter(c => {
      if (!c.birthday) return false
      const days = calculateDaysUntilBirthday(new Date(c.birthday), today)
      return days >= 0 && days <= 7
    })

    if (upcomingBirthdays.length > 0) {
      recs.push({
        type: "personal",
        title: t("ai", "scRecBirthday"),
        description: `${upcomingBirthdays.length} ${t("ai", "scRecBirthdayDesc")}`,
        targetCustomers: upcomingBirthdays,
        suggestedVoucher: {
          name: t("ai", "scRecBirthdayGift"),
          code: `BDAY${Date.now().toString().slice(-4)}`,
          discount_type: "fixed",
          discount_value: 20,
          valid_days: 7,
          points_required: 0
        },
        estimatedImpact: t("ai", "scRecBirthdayImpact")
      })
    }

    const vipCustomers = customers.filter(c => (c.total_spent || 0) >= 1000)
    if (vipCustomers.length > 0) {
      recs.push({
        type: "personal",
        title: t("ai", "scRecVipReward"),
        description: `${vipCustomers.length} ${t("ai", "scRecVipDesc")}`,
        targetCustomers: vipCustomers.slice(0, 5),
        suggestedVoucher: {
          name: t("ai", "scRecVipVoucher"),
          code: `VIP${Date.now().toString().slice(-4)}`,
          discount_type: "percentage",
          discount_value: 20,
          valid_days: 30,
          points_required: 0
        },
        estimatedImpact: t("ai", "scRecVipImpact")
      })
    }

    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    const newCustomers = customers.filter(c => new Date(c.created_at) > sevenDaysAgo)
    if (newCustomers.length > 0) {
      recs.push({
        type: "personal",
        title: t("ai", "scRecNewWelcome"),
        description: `${newCustomers.length} ${t("ai", "scRecNewDesc")}`,
        targetCustomers: newCustomers,
        suggestedVoucher: {
          name: t("ai", "scRecNewVoucher"),
          code: `NEW${Date.now().toString().slice(-4)}`,
          discount_type: "percentage",
          discount_value: 10,
          valid_days: 14,
          points_required: 0
        },
        estimatedImpact: t("ai", "scRecNewImpact")
      })
    }

    setRecommendations(recs)
  }

  const createVoucherFromRecommendation = async (rec: AIRecommendation) => {
    setCreating(true)
    try {
      const validUntil = new Date()
      validUntil.setDate(validUntil.getDate() + rec.suggestedVoucher.valid_days)

      if (rec.type === "global") {
        // 创建全局优惠券
        const { data: voucher, error } = await supabase
          .from("vouchers")
          .insert({
            code: rec.suggestedVoucher.code,
            name: rec.suggestedVoucher.name,
            description: rec.description,
            points_required: rec.suggestedVoucher.points_required,
            discount_type: rec.suggestedVoucher.discount_type,
            discount_value: rec.suggestedVoucher.discount_value,
            valid_until: validUntil.toISOString(),
            voucher_type: "global",
            created_by_ai: true,
            ai_reason: rec.description
          })
          .select()
          .single()

        if (error) throw error

        toast.success(`${t("ai", "scGlobalVoucherCreated")} "${rec.suggestedVoucher.name}"`, {
          description: t("admin", "allCustomersRedeem")
        })
      } else {
        // 为每个目标客户创建个人优惠券
        for (const customer of rec.targetCustomers) {
          const personalCode = `${rec.suggestedVoucher.code}-${customer.phone?.slice(-4) || customer.id.slice(-4)}`
          
          // 创建优惠券
          const { data: voucher, error: voucherError } = await supabase
            .from("vouchers")
            .insert({
              code: personalCode,
              name: rec.suggestedVoucher.name,
              description: `${t("admin", "exclusiveOffer")} - ${customer.full_name || t("ai", "scUnknown")}`,
              points_required: 0,
              discount_type: rec.suggestedVoucher.discount_type,
              discount_value: rec.suggestedVoucher.discount_value,
              valid_until: validUntil.toISOString(),
              voucher_type: "personal",
              target_customer_id: customer.id,
              created_by_ai: true,
              ai_reason: rec.description
            })
            .select()
            .single()

          if (voucherError) {
            console.error("Error creating voucher for", customer.full_name, voucherError)
            continue
          }

          // 自动分配给客户
          if (voucher) {
            await supabase
              .from("user_vouchers")
              .insert({
                user_id: customer.id,
                voucher_id: voucher.id,
                code: personalCode,
                expires_at: validUntil.toISOString()
              })
          }
        }

        toast.success(`${rec.targetCustomers.length} ${t("ai", "scPersonalVouchersCreated")}`)
      }

      // 刷新数据
      loadData()
    } catch (err: any) {
      console.error("Create voucher error:", err)
      toast.error(err.message || t("ai", "scCreateVoucherFailed"))
    } finally {
      setCreating(false)
    }
  }

  const createPersonalVoucher = async () => {
    if (!customerAnalysis || !customerAnalysis.suggestedVoucher) {
      toast.error(t("ai", "scNoVoucherRecommended"))
      return
    }

    setCreating(true)
    try {
      const customer = customerAnalysis.customer
      const suggestion = customerAnalysis.suggestedVoucher
      const validUntil = new Date()
      validUntil.setDate(validUntil.getDate() + 14)
      const code = `AI${Date.now().toString().slice(-6)}`

      // 创建个人优惠券
      const { data: voucher, error } = await supabase
        .from("vouchers")
        .insert({
          code: code,
          name: suggestion.name,
          description: suggestion.reason,
          points_required: 0,
          discount_type: suggestion.discount_type,
          discount_value: suggestion.discount_value,
          valid_until: validUntil.toISOString(),
          voucher_type: "personal",
          target_customer_id: customer.id,
          created_by_ai: true,
          ai_reason: suggestion.reason
        })
        .select()
        .single()

      if (error) throw error

      // 自动分配给客户
      if (voucher) {
        await supabase
          .from("user_vouchers")
          .insert({
            user_id: customer.id,
            voucher_id: voucher.id,
            code: code,
            expires_at: validUntil.toISOString()
          })
      }

      toast.success(`${t("ai", "scExclVoucherCreated")} ${customer.full_name || t("ai", "scUnknown")}!`)
      setCustomerAnalysis(null)
      setSelectedCustomer(null)
      loadData()
    } catch (err: any) {
      console.error("Error:", err)
      toast.error(err.message || t("ai", "scVoucherCreateFailed"))
    } finally {
      setCreating(false)
    }
  }

  const getInitials = (name: string | null) => {
    if (!name) return "?"
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
  }

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "high": return "text-red-500 bg-red-500/10"
      case "medium": return "text-orange-500 bg-orange-500/10"
      default: return "text-green-500 bg-green-500/10"
    }
  }

  if (loading) {
    return (
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* AI 建议面板 */}
      <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20">
        <CardHeader>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2 flex-wrap">
                <Brain className="w-6 h-6 text-amber-500" />
                {t("ai", "scTitle")}
                {aiEnhanced && (
                  <Badge className="bg-green-500/15 text-green-700 border-green-500/30 text-[10px]">
                    {t("ai", "badgeAiPowered")}
                  </Badge>
                )}
                {aiRecLoading && (
                  <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/30 text-[10px]">
                    <Loader2 className="w-3 h-3 animate-spin mr-1" />
                    {t("ai", "badgeAiAnalyzing")}
                  </Badge>
                )}
                {aiRecError && !aiEnhanced && (
                  <Badge className="bg-orange-500/15 text-orange-700 border-orange-500/30 text-[10px]">
                    {t("ai", "badgeRuleFallback")}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {aiEnhanced ? t("ai", "aiDescEnhanced") : t("ai", "scDesc")}
              </CardDescription>
              {aiRecError && (
                <p className="text-xs text-orange-600 mt-1">{t("ai", "aiUnavailablePrefix")} {aiRecError}</p>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={refreshAIRecommendations}
              disabled={aiRecLoading}
            >
              {aiRecLoading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
              ) : (
                <Sparkles className="w-4 h-4 mr-1.5" />
              )}
              {aiRecLoading ? t("ai", "analyzing") : t("ai", "reanalyzeWithAi")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {recommendations.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              {aiRecLoading ? t("ai", "aiAnalyzingCustomerData") : t("ai", "scNoSuggestions")}
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {recommendations.map((rec, index) => (
                <Card key={index} className="bg-card/50">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <Badge className={rec.type === "global" ? "bg-blue-500" : "bg-purple-500"}>
                          {rec.type === "global" ? t("ai", "scGlobal") : t("ai", "scPersonal")}
                        </Badge>
                        <h4 className="font-semibold mt-2">{rec.title}</h4>
                        <p className="text-sm text-muted-foreground">{rec.description}</p>
                      </div>
                      <Zap className="w-5 h-5 text-amber-500" />
                    </div>
                    
                    <div className="bg-muted/30 rounded-lg p-3 mb-3">
                      <p className="text-sm font-medium">{t("ai", "scSuggestedVoucher")}</p>
                      <p className="text-amber-500 font-bold">
                        {rec.suggestedVoucher.name} - 
                        {rec.suggestedVoucher.discount_type === "percentage" 
                          ? ` ${rec.suggestedVoucher.discount_value}% OFF`
                          : ` RM${rec.suggestedVoucher.discount_value} OFF`
                        }
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {rec.estimatedImpact}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs text-muted-foreground">{t("ai", "scTargetCustomer")}</span>
                      <div className="flex -space-x-2">
                        {rec.targetCustomers.slice(0, 3).map(c => (
                          <Avatar key={c.id} className="w-6 h-6 border-2 border-background">
                            <AvatarFallback className="text-xs">
                              {getInitials(c.full_name)}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                        {rec.targetCustomers.length > 3 && (
                          <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs">
                            +{rec.targetCustomers.length - 3}
                          </div>
                        )}
                      </div>
                    </div>

                    <Button 
                      size="sm" 
                      className="w-full gap-2"
                      onClick={() => createVoucherFromRecommendation(rec)}
                      disabled={creating}
                    >
                      {creating ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Plus className="w-4 h-4" />
                      )}
                      {t("ai", "scCreateVoucher")}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 客户分析 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* 客户列表 */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-500" />
              {t("ai", "scCustomerList")}
            </CardTitle>
            <CardDescription>
              {t("ai", "scSelectForAnalysis")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {customers.map(customer => {
                  const daysSinceVisit = customer.last_visit 
                    ? Math.floor((Date.now() - new Date(customer.last_visit).getTime()) / (1000 * 60 * 60 * 24))
                    : 999
                  const isAtRisk = daysSinceVisit > 30

                  return (
                    <div
                      key={customer.id}
                      onClick={() => analyzeCustomer(customer)}
                      className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedCustomer?.id === customer.id 
                          ? "bg-primary/10 border border-primary/30" 
                          : "hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>{getInitials(customer.full_name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{customer.full_name || t("ai", "scUnknown")}</p>
                          <p className="text-xs text-muted-foreground">
                            {customer.phone || t("ai", "scNoPhone")} • RM{(customer.total_spent || 0).toFixed(0)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        {isAtRisk && (
                          <Badge variant="outline" className="text-orange-500 border-orange-500/30 text-xs">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            {daysSinceVisit}{t("ai", "daysAgo")}
                          </Badge>
                        )}
                        {customer.birthday && (
                          <Cake className="w-4 h-4 text-pink-500 inline ml-2" />
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* 分析结果 */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              {t("ai", "scAiResults")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analyzing ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
              </div>
            ) : customerAnalysis ? (
              <div className="space-y-4">
                {/* 客户信息 */}
                <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
                  <Avatar className="w-16 h-16">
                    <AvatarFallback className="text-xl">
                      {getInitials(customerAnalysis.customer.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-lg font-semibold">
                      {customerAnalysis.customer.full_name || t("ai", "scUnknownCustomer")}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {customerAnalysis.customer.phone}
                    </p>
                    <Badge className={getRiskColor(customerAnalysis.riskLevel)}>
                      {customerAnalysis.riskLevel === "high" ? t("ai", "scHighRisk") : 
                       customerAnalysis.riskLevel === "medium" ? t("ai", "scMediumRisk") : t("ai", "scLowRisk")}
                    </Badge>
                  </div>
                </div>

                {/* 洞察 */}
                <div>
                  <h4 className="font-medium mb-2">📊 {t("ai", "scCustomerInsights")}</h4>
                  <ul className="space-y-1">
                    {customerAnalysis.insights.map((insight, i) => (
                      <li key={i} className="text-sm text-muted-foreground">
                        {insight}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* 推荐行动 */}
                <div className="p-3 bg-amber-500/10 rounded-lg">
                  <h4 className="font-medium text-amber-500 mb-1">💡 {t("ai", "scRecommendedActions")}</h4>
                  <p className="text-sm">{customerAnalysis.recommendedAction}</p>
                </div>

                {/* 推荐优惠券 */}
                {customerAnalysis.suggestedVoucher && (
                  <div className="p-4 border border-dashed border-amber-500/30 rounded-lg">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Gift className="w-4 h-4 text-amber-500" />
                      {t("ai", "scSuggestCreateVoucher")}
                    </h4>
                    <div className="bg-muted/30 rounded p-3 mb-3">
                      <p className="font-semibold text-amber-500">
                        {customerAnalysis.suggestedVoucher.name}
                      </p>
                      <p className="text-lg font-bold">
                        {customerAnalysis.suggestedVoucher.discount_type === "percentage"
                          ? `${customerAnalysis.suggestedVoucher.discount_value}% OFF`
                          : `RM${customerAnalysis.suggestedVoucher.discount_value} OFF`
                        }
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {customerAnalysis.suggestedVoucher.reason}
                      </p>
                    </div>
                    <Button 
                      className="w-full gap-2"
                      onClick={createPersonalVoucher}
                      disabled={creating}
                    >
                      {creating ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Plus className="w-4 h-4" />
                      )}
                      {t("ai", "scCreateExclVoucher")}
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Target className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>{t("ai", "scSelectCustomerFirst")}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
