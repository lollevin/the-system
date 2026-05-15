"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import {
  Loader2,
  Brain,
  Send,
  CheckCircle2,
  AlertTriangle,
  Cake,
  Star,
  TrendingDown,
  Sparkles,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Moon,
  UserPlus,
  Zap,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { useLanguage } from "@/lib/i18n"
import { checkWhatsAppConnected } from "@/components/admin/floating-whatsapp"
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
  vouchersActive: number
  avgSpend: number
  membershipTier: string
  lastVoucherUsed: string | null
  recentTransactions: any[]
  totalSessions: number
  avgSessionSeconds: number
  lastSessionAt: string | null
}

interface GeneratedVoucher {
  id: string
  code: string
  name: string
  discount_type: "percentage" | "fixed"
  discount_value: number
  reason: string
  createdInDb: boolean
}

interface SelectedCustomer {
  profile: Profile
  analysis: CustomerAnalysis | null
  message: string
  voucher: GeneratedVoucher | null
  isAnalyzing: boolean
  messageSent: boolean
}

export function AICustomerAnalyzer() {
  const [customers, setCustomers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCustomers, setSelectedCustomers] = useState<SelectedCustomer[]>([])
  const [expandedCustomerId, setExpandedCustomerId] = useState<string | null>(null)
  const [batchAnalyzing, setBatchAnalyzing] = useState(false)
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 })
  const [sendingAll, setSendingAll] = useState(false)
  const [refiningTone, setRefiningTone] = useState<string | null>(null)

  const supabase = createClient()
  const { t, language } = useLanguage()

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
    } catch {
      toast.error(t("ai", "caFailedLoadCustomers"))
    } finally {
      setLoading(false)
    }
  }

  // ========================================================================
  // AI AUTO-GROUPING
  // ========================================================================
  interface BatchGroup {
    id: string
    title: string
    description: string
    icon: any
    color: string
    bgColor: string
    members: Profile[]
  }

  const [batches, setBatches] = useState<BatchGroup[]>([])
  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set())
  const [isGrouping, setIsGrouping] = useState(false)

  const daysSince = (date: string | null | undefined): number => {
    if (!date) return 999
    return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24))
  }

  const isBirthdayWithin = (bday: string | null | undefined, days: number): boolean => {
    if (!bday) return false
    const now = new Date()
    const b = new Date(bday)
    const thisYear = new Date(now.getFullYear(), b.getMonth(), b.getDate())
    const diff = (thisYear.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    return diff >= -1 && diff <= days
  }

  const buildBatches = (): BatchGroup[] => {
    const all = customers
    const groups: BatchGroup[] = []

    const birthday = all.filter(c => isBirthdayWithin(c.birthday, 7))
    if (birthday.length > 0) {
      groups.push({
        id: "birthday",
        title: t("ai", "batchBirthdayTitle"),
        description: t("ai", "batchBirthdayDesc"),
        icon: Cake,
        color: "text-pink-500",
        bgColor: "bg-pink-500/10 border-pink-500/30",
        members: birthday,
      })
    }

    const d7to14 = all.filter(c => { const d = daysSince(c.last_visit); return d >= 7 && d < 30 })
    if (d7to14.length > 0) {
      groups.push({
        id: "dormant7",
        title: `${d7to14.length} ${t("ai", "batch7dTitle")}`,
        description: t("ai", "batch7dDesc"),
        icon: Zap,
        color: "text-amber-500",
        bgColor: "bg-amber-500/10 border-amber-500/30",
        members: d7to14,
      })
    }

    const d30to60 = all.filter(c => { const d = daysSince(c.last_visit); return d >= 30 && d < 60 })
    if (d30to60.length > 0) {
      groups.push({
        id: "dormant30",
        title: `${d30to60.length} ${t("ai", "batch30dTitle")}`,
        description: t("ai", "batch30dDesc"),
        icon: Moon,
        color: "text-orange-500",
        bgColor: "bg-orange-500/10 border-orange-500/30",
        members: d30to60,
      })
    }

    const d60plus = all.filter(c => { const d = daysSince(c.last_visit); return d >= 60 && d < 999 })
    if (d60plus.length > 0) {
      groups.push({
        id: "dormant60",
        title: `${d60plus.length} ${t("ai", "batch60dTitle")}`,
        description: t("ai", "batch60dDesc"),
        icon: AlertTriangle,
        color: "text-red-500",
        bgColor: "bg-red-500/10 border-red-500/30",
        members: d60plus,
      })
    }

    const vips = all.filter(c => (c.total_spent || 0) >= 1000)
    if (vips.length > 0) {
      groups.push({
        id: "vip",
        title: `${vips.length} ${t("ai", "batchVipTitle")}`,
        description: t("ai", "batchVipDesc"),
        icon: Star,
        color: "text-amber-500",
        bgColor: "bg-amber-500/10 border-amber-500/30",
        members: vips,
      })
    }

    const newbies = all.filter(c => (c.visit_count || 0) <= 2 && (c.visit_count || 0) > 0)
    if (newbies.length > 0) {
      groups.push({
        id: "new",
        title: `${newbies.length} ${t("ai", "batchNewTitle")}`,
        description: t("ai", "batchNewDesc"),
        icon: UserPlus,
        color: "text-blue-500",
        bgColor: "bg-blue-500/10 border-blue-500/30",
        members: newbies,
      })
    }

    const neverCame = all.filter(c => !c.last_visit && (c.visit_count || 0) === 0)
    if (neverCame.length > 0) {
      groups.push({
        id: "never",
        title: `${neverCame.length} ${t("ai", "batchNeverTitle")}`,
        description: t("ai", "batchNeverDesc"),
        icon: AlertTriangle,
        color: "text-gray-500",
        bgColor: "bg-gray-500/10 border-gray-500/30",
        members: neverCame,
      })
    }

    const highPoints = all.filter(c => (c.points_balance || 0) >= 500)
    if (highPoints.length > 0) {
      groups.push({
        id: "highPoints",
        title: `${highPoints.length} ${t("ai", "batchHighPointsTitle")}`,
        description: t("ai", "batchHighPointsDesc"),
        icon: TrendingDown,
        color: "text-purple-500",
        bgColor: "bg-purple-500/10 border-purple-500/30",
        members: highPoints,
      })
    }

    return groups
  }

  const runAutoGrouping = () => {
    setIsGrouping(true)
    setTimeout(() => {
      const groups = buildBatches()
      setBatches(groups)
      setExpandedBatches(new Set(groups.slice(0, 2).map(g => g.id)))
      setIsGrouping(false)
      if (groups.length === 0) {
        toast.warning(t("ai", "batchNoneFound"))
      } else {
        toast.success(`${t("ai", "batchFound")} ${groups.length} ${t("ai", "batchBatches")}`)
      }
    }, 400)
  }

  useEffect(() => {
    if (!loading && customers.length > 0 && batches.length === 0) {
      runAutoGrouping()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, customers.length])

  const toggleBatchExpanded = (id: string) => {
    setExpandedBatches(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const isCustomerSelected = (id: string) =>
    selectedCustomers.some(sc => sc.profile.id === id)

  const addCustomersToSelection = (list: Profile[]) => {
    setSelectedCustomers(prev => {
      const existingIds = new Set(prev.map(sc => sc.profile.id))
      const additions = list
        .filter(c => !existingIds.has(c.id))
        .map(c => ({ profile: c, analysis: null, message: "", voucher: null, isAnalyzing: false, messageSent: false }))
      return [...prev, ...additions]
    })
  }

  const removeCustomersFromSelection = (list: Profile[]) => {
    const ids = new Set(list.map(c => c.id))
    setSelectedCustomers(prev => prev.filter(sc => !ids.has(sc.profile.id)))
  }

  const toggleBatchSelection = (batch: BatchGroup) => {
    const allSelected = batch.members.every(m => isCustomerSelected(m.id))
    if (allSelected) {
      removeCustomersFromSelection(batch.members)
    } else {
      addCustomersToSelection(batch.members)
    }
  }

  const toggleCustomer = (customer: Profile) => {
    const exists = selectedCustomers.find(sc => sc.profile.id === customer.id)
    if (exists) {
      setSelectedCustomers(prev => prev.filter(sc => sc.profile.id !== customer.id))
      if (expandedCustomerId === customer.id) setExpandedCustomerId(null)
    } else {
      setSelectedCustomers(prev => [...prev, {
        profile: customer,
        analysis: null,
        message: "",
        voucher: null,
        isAnalyzing: false,
        messageSent: false
      }])
      setExpandedCustomerId(customer.id)
    }
  }

  const analyzeCustomerData = async (customer: Profile): Promise<CustomerAnalysis> => {
    const today = new Date()
    const { data: transactions } = await supabase
      .from("transactions").select("*").eq("user_id", customer.id)
      .order("created_at", { ascending: false }).limit(20)
    const { data: userVouchers } = await supabase
      .from("user_vouchers").select("*, voucher:vouchers(*)")
      .eq("user_id", customer.id).order("created_at", { ascending: false })

    const totalSpent = customer.total_spent || 0
    const visitCount = customer.visit_count || 0
    const lastVisit = customer.last_visit
    const daysSinceLastVisit = lastVisit
      ? Math.floor((today.getTime() - new Date(lastVisit).getTime()) / (1000 * 60 * 60 * 24))
      : 999

    let hasBirthday = false
    if (customer.birthday) {
      const bday = new Date(customer.birthday)
      const thisYearBday = new Date(today.getFullYear(), bday.getMonth(), bday.getDate())
      const diff = (thisYearBday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      hasBirthday = diff >= -1 && diff <= 7
    }

    let membershipTier = "Bronze"
    if (totalSpent >= 5000) membershipTier = "Diamond"
    else if (totalSpent >= 3000) membershipTier = "Gold"
    else if (totalSpent >= 1000) membershipTier = "Silver"

    const usedVouchers = userVouchers?.filter(v => v.is_used) || []
    const activeVouchers = userVouchers?.filter(v => !v.is_used && new Date(v.expires_at) > today) || []

    let totalSessions = 0, avgSessionSeconds = 0, lastSessionAt: string | null = null
    try {
      const { data: sessions } = await supabase
        .from("user_sessions").select("*").eq("user_id", customer.id)
        .order("started_at", { ascending: false }).limit(100)
      if (sessions && sessions.length > 0) {
        totalSessions = sessions.length
        avgSessionSeconds = Math.round(sessions.reduce((s: number, r: any) => s + (r.duration_seconds || 0), 0) / sessions.length)
        lastSessionAt = sessions[0].started_at
      }
    } catch {}

    return {
      totalSpent, visitCount, lastVisit,
      pointsBalance: customer.points_balance || 0,
      daysSinceLastVisit,
      isVip: totalSpent >= 1000,
      isAtRisk: daysSinceLastVisit > 30,
      hasBirthday,
      vouchersUsed: usedVouchers.length,
      vouchersActive: activeVouchers.length,
      avgSpend: visitCount > 0 ? totalSpent / visitCount : 0,
      membershipTier,
      lastVoucherUsed: usedVouchers[0]?.used_at || null,
      recentTransactions: transactions || [],
      totalSessions, avgSessionSeconds, lastSessionAt,
    }
  }

  const callAIForUniqueMessage = async (
    customer: Profile,
    analysis: CustomerAnalysis,
    customerIndex: number,
    totalCustomers: number,
    previousSummaries: string[]
  ): Promise<string> => {
    try {
      const previousContext = previousSummaries.length > 0
        ? `\n\nIMPORTANT: You have already generated messages for ${previousSummaries.length} other customers. Their message themes were: [${previousSummaries.join(", ")}]. You MUST generate a COMPLETELY DIFFERENT message with different wording, different opening, different structure, and different promotional angle for this customer. Do NOT reuse the same template or phrases.`
        : ""

      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal: `Generate a unique personalized WhatsApp message for customer "${customer.full_name}" (customer ${customerIndex + 1} of ${totalCustomers}):\n\nCustomer Profile:\n- Name: ${customer.full_name}\n- Days since last visit: ${analysis.daysSinceLastVisit}\n- Total spent: RM${analysis.totalSpent}\n- Points balance: ${analysis.pointsBalance}\n- Membership tier: ${analysis.membershipTier}\n- Visit count: ${analysis.visitCount}\n- Average spend per visit: RM${analysis.avgSpend.toFixed(0)}\n- Is birthday (within 7 days): ${analysis.hasBirthday}\n- Is at risk (inactive 30+ days): ${analysis.isAtRisk}\n- Active vouchers: ${analysis.vouchersActive}\n- Vouchers used: ${analysis.vouchersUsed}\n${previousContext}\n\nRequirements:\n- Keep under 200 words, friendly tone, use emojis\n- Malaysia market (mix of English/Malay/Chinese is OK)\n- Include specific data points from this customer's profile\n- ONLY output the WhatsApp message text, nothing else\n- Make this message feel truly personal to THIS specific customer\n- IMPORTANT: Do NOT include any URL or link in the message text`,
          language,
          requestId: `${customer.id}-${Date.now()}`
        }),
      })

      if (!response.ok) return ""
      const data = await response.json()
      if (data.message) {
        let msg = data.message
        if (msg.includes("###")) {
          const match = msg.match(/### .*?\n\n([\s\S]*?)(?:\n---|\n\n---|$)/)
          if (match) msg = match[1].trim()
        }
        if (msg.startsWith('"') && msg.endsWith('"')) msg = msg.slice(1, -1)
        return msg
      }
    } catch (err: any) {
      console.error(`[AI Analyzer] Failed for ${customer.full_name}:`, err?.message || err)
    }
    return ""
  }

  const getTemplateMessage = (customer: Profile, analysis: CustomerAnalysis): string => {
    if (analysis.hasBirthday)
      return `🎂 Happy Birthday ${customer.full_name}!\n\nThank you for being a valued member! 🎉\nAs a birthday gift, enjoy 20% OFF this week!\n\nCome celebrate with us!\n\n- JP&Co Team ❤️`
    if (analysis.isAtRisk && analysis.daysSinceLastVisit > 60)
      return `👋 Hey ${customer.full_name}!\n\nIt's been ${analysis.daysSinceLastVisit} days! We miss you! 😊\nSpecial come-back offer: 15% OFF your next order!\n\nYou have ${analysis.pointsBalance} points waiting!\n\n- JP&Co Team 🍔`
    if (analysis.isAtRisk)
      return `🍔 Hey ${customer.full_name}!\n\nHaven't seen you in ${analysis.daysSinceLastVisit} days!\nJust for you: 10% OFF on your next visit!\n\nYou have ${analysis.pointsBalance} points!\n\n- JP&Co Team 🍟`
    if (analysis.isVip)
      return `⭐ Hi ${customer.full_name}!\n\nThank you for being a ${analysis.membershipTier} member!\n💰 Total: RM${analysis.totalSpent.toFixed(0)}\n✨ Points: ${analysis.pointsBalance}\n\nKeep collecting for amazing rewards!\n\n- JP&Co Team ⭐`
    return `🍔 Hi ${customer.full_name}!\n\nHope you're doing great!\n✨ Points: ${analysis.pointsBalance}\n📊 Visits: ${analysis.visitCount}\n\nCheck out our latest menu!\n\n- JP&Co Team 🍟`
  }

  const urlRegex = /https?:\/\/[^\s]+/gi

  const stripUrlsFromText = (text: string): string => {
    return text
      .replace(urlRegex, "")
      .split("\n")
      .map(l => l.trimEnd())
      .filter(l => {
        const lc = l.toLowerCase().trim()
        if (!lc) return true
        if (lc.includes("claim here") || lc.includes("claim voucher")) return false
        if (lc.includes("voucher code")) return false
        if (lc.includes("view points") || lc.includes("check your rewards")) return false
        if (lc.includes("see our menu")) return false
        if (lc.includes("read more") || lc.includes("查看更多")) return false
        if (lc === "👉" || lc === "🍽️" || lc === "📱" || lc === "🎫") return false
        if (lc.endsWith(":")) return false
        return true
      })
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  }

  const rebuildMessageWithoutVoucher = (message: string, _analysis: CustomerAnalysis | null, profile: Profile): string => {
    const cleaned = message
      .split("\n")
      .filter(line => {
        const l = line.toLowerCase()
        if (!line.trim()) return true
        if (l.includes("voucher") || l.includes("优惠券")) return false
        if (l.includes("claim here") || l.includes("claim voucher") || l.includes("领取")) return false
        if (l.includes("view=vouchers") || l.includes("code=")) return false
        if (l.includes("view points & rewards") || l.includes("check your rewards")) return false
        if (l.includes("see our menu")) return false
        if (l.includes("/pwa?view=home") || l.includes("/pwa?view=menu")) return false
        return true
      })
      .join("\n")
      .replace(/https?:\/\/\S*view=vouchers\S*/gi, "")
      .replace(/🎫.*$/gim, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
    return cleaned || `Hi ${profile.full_name || "there"}!`
  }

  const batchAnalyzeAndGenerate = async () => {
    if (selectedCustomers.length === 0) { toast.error(t("ai", "caSelectFirst")); return }

    const waConnected = await checkWhatsAppConnected()
    if (!waConnected) {
      toast.warning(t("ai", "caWaNotConnected"), { description: t("ai", "caStillGenerate"), duration: 5000 })
    }

    setBatchAnalyzing(true)
    setBatchProgress({ current: 0, total: selectedCustomers.length })
    const previousMessageSummaries: string[] = []
    const updated = [...selectedCustomers]

    for (let i = 0; i < updated.length; i++) {
      updated[i] = { ...updated[i], isAnalyzing: true }
      setSelectedCustomers([...updated])

      try {
        const analysis = await analyzeCustomerData(updated[i].profile)
        let message = await callAIForUniqueMessage(updated[i].profile, analysis, i, updated.length, previousMessageSummaries)
        if (!message || message.length < 30) message = getTemplateMessage(updated[i].profile, analysis)

        const theme = analysis.hasBirthday ? "birthday"
          : analysis.isAtRisk ? `win-back(${analysis.daysSinceLastVisit}d)`
          : analysis.isVip ? `vip-${analysis.membershipTier}`
          : `regular(${analysis.visitCount}visits)`
        previousMessageSummaries.push(`${updated[i].profile.full_name}: ${theme}`)

        let voucher: GeneratedVoucher | null = null
        let shouldCreateVoucher = false
        let voucherReason = "", voucherName = ""
        let voucherDiscount = 10
        const voucherType: "percentage" | "fixed" = "percentage"

        if (analysis.hasBirthday) { shouldCreateVoucher = true; voucherReason = "Birthday Special"; voucherName = "Birthday Gift"; voucherDiscount = 20 }
        else if (analysis.daysSinceLastVisit > 60) { shouldCreateVoucher = true; voucherReason = "Win-back: Inactive 60+ days"; voucherName = "We Miss You"; voucherDiscount = 15 }
        else if (analysis.daysSinceLastVisit > 30) { shouldCreateVoucher = true; voucherReason = "Win-back: Inactive 30+ days"; voucherName = "Come Back Special"; voucherDiscount = 10 }
        else if (analysis.membershipTier === "Diamond") { shouldCreateVoucher = true; voucherReason = "VIP Diamond Exclusive"; voucherName = "Diamond Exclusive"; voucherDiscount = 15 }
        else if (analysis.visitCount <= 2) { shouldCreateVoucher = true; voucherReason = "New customer welcome"; voucherName = "Welcome Gift"; voucherDiscount = 10 }

        if (shouldCreateVoucher) {
          const code = `AI${Math.random().toString(36).substring(2, 8).toUpperCase()}`
          voucher = { id: "", code, name: voucherName, discount_type: voucherType, discount_value: voucherDiscount, reason: voucherReason, createdInDb: false }
          message += `\n\n🎫 A special member reward has been prepared for you.`
        }

        message = stripUrlsFromText(message)
        updated[i] = { ...updated[i], analysis, message, voucher, isAnalyzing: false, messageSent: false }
      } catch {
        updated[i] = { ...updated[i], isAnalyzing: false }
        toast.error(`${t("ai", "caFailedAnalyze")} ${updated[i].profile.full_name}`)
      }

      setBatchProgress({ current: i + 1, total: updated.length })
      setSelectedCustomers([...updated])
    }

    setBatchAnalyzing(false)
    toast.success(`${t("ai", "caGeneratedMessages")} ${updated.length} ${t("ai", "caCustomers")}`)
    if (updated.length > 0) setExpandedCustomerId(updated[0].profile.id)
  }

  const formatPhone = (phone: string | null): string => {
    if (!phone) return ""
    const clean = phone.replace(/\D/g, '')
    if (clean.startsWith("60")) return clean
    if (clean.startsWith("0")) return "60" + clean.substring(1)
    return "60" + clean
  }

  const openWaFallback = (phone: string, message: string) => {
    if (!phone) return
    window.open(`https://wa.me/${phone}${message ? `?text=${encodeURIComponent(message)}` : ""}`, "_blank")
  }

  const buildSmartWhatsAppPayload = (sc: SelectedCustomer) => ({
    message: stripUrlsFromText(sc.message),
    imageCaption: stripUrlsFromText(sc.message),
    imageUrl: null,
    ctaUrl: null,
    ctaLabel: null,
    imagePrompt: null,
  })

  const createVoucherInDb = async (sc: SelectedCustomer): Promise<GeneratedVoucher | null> => {
    if (!sc.voucher || sc.voucher.createdInDb) return sc.voucher
    try {
      const { data: voucherData, error } = await supabase
        .from("vouchers")
        .insert({
          code: sc.voucher.code,
          name: sc.voucher.name,
          description: `AI generated for ${sc.profile.full_name}`,
          points_required: 0,
          discount_type: sc.voucher.discount_type,
          discount_value: sc.voucher.discount_value,
          valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          is_active: true,
          voucher_type: "personal",
          target_customer_id: sc.profile.id,
          created_by_ai: true,
          ai_reason: sc.voucher.reason,
          max_uses: 1
        })
        .select().single()

      if (!error && voucherData) {
        await supabase.from("user_vouchers").insert({
          user_id: sc.profile.id,
          voucher_id: voucherData.id,
          code: sc.voucher.code,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          is_used: false
        })
        return { ...sc.voucher, id: voucherData.id, createdInDb: true }
      }
    } catch (err) {
      console.error("Failed to create voucher:", err)
    }
    return sc.voucher
  }

  const sendWhatsApp = async (customerId: string) => {
    const sc = selectedCustomers.find(s => s.profile.id === customerId)
    if (!sc) return
    const phone = formatPhone(sc.profile.phone)

    const isConnected = await checkWhatsAppConnected()
    if (!isConnected) {
      openWaFallback(phone, sc.message || `Hi ${sc.profile.full_name || ""}`)
      toast.warning(t("ai", "caWaNotConnectedSend"), { description: t("ai", "waSwitchedToWaMe"), duration: 5000 })
      return
    }

    try {
      let updatedVoucher = sc.voucher
      if (sc.voucher && !sc.voucher.createdInDb) {
        updatedVoucher = await createVoucherInDb(sc)
        if (updatedVoucher?.createdInDb) {
          setSelectedCustomers(prev => prev.map(s => s.profile.id === customerId ? { ...s, voucher: updatedVoucher } : s))
        }
      }

      const payload = buildSmartWhatsAppPayload(sc)
      const response = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, message: payload.message, imageCaption: payload.imageCaption, imageUrl: payload.imageUrl, imagePrompt: payload.imagePrompt, ctaUrl: payload.ctaUrl, ctaLabel: payload.ctaLabel }),
      })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.error || "Failed to send message")

      setSelectedCustomers(prev => prev.map(s => s.profile.id === customerId ? { ...s, messageSent: true, voucher: updatedVoucher } : s))
      try {
        await supabase.from("sent_messages").insert({ customer_id: sc.profile.id, message_type: "ai_personalized", message_content: payload.message, channel: "whatsapp", status: "sent" })
      } catch {}
      toast.success(`${t("ai", "caMessageSentTo")} ${sc.profile.full_name}`)
    } catch (error: any) {
      openWaFallback(phone, sc.message || `Hi ${sc.profile.full_name || ""}`)
      toast.warning(`${t("ai", "caFailedSendTo")} ${sc.profile.full_name}`, { description: `${error.message || "Send failed"}. ${t("ai", "waSwitchedToWaMe")}` })
    }
  }

  const sendAllMessages = async () => {
    const toSend = selectedCustomers.filter(sc => sc.analysis && !sc.messageSent && sc.profile.phone)
    if (toSend.length === 0) { toast.error(t("ai", "caNoMessages")); return }

    const isConnected = await checkWhatsAppConnected()
    if (!isConnected) { toast.error(t("ai", "caWaNotConnectedSend"), { description: t("ai", "caScanQr"), duration: 5000 }); return }

    setSendingAll(true)
    let successCount = 0, failCount = 0

    for (const sc of toSend) {
      try {
        let updatedVoucher = sc.voucher
        if (sc.voucher && !sc.voucher.createdInDb) updatedVoucher = await createVoucherInDb(sc)

        const phone = formatPhone(sc.profile.phone)
        const payload = buildSmartWhatsAppPayload(sc)
        const response = await fetch("/api/whatsapp/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone, message: payload.message, imageCaption: payload.imageCaption, imageUrl: payload.imageUrl, imagePrompt: payload.imagePrompt, ctaUrl: payload.ctaUrl, ctaLabel: payload.ctaLabel }),
        })
        const result = await response.json()
        if (!response.ok || !result.success) throw new Error(result.error)

        setSelectedCustomers(prev => prev.map(s => s.profile.id === sc.profile.id ? { ...s, messageSent: true, voucher: updatedVoucher } : s))
        try { await supabase.from("sent_messages").insert({ customer_id: sc.profile.id, message_type: "ai_personalized", message_content: payload.message, channel: "whatsapp", status: "sent" }) } catch {}
        successCount++
      } catch { failCount++ }
      await new Promise(r => setTimeout(r, 1500))
    }

    setSendingAll(false)
    if (failCount === 0) toast.success(t("ai", "caAllSent"))
    else toast.warning(`${t("ai", "caSentFailed")} ${successCount}, ${t("ai", "caFailed")} ${failCount}`)
  }

  const updateMessage = (customerId: string, newMessage: string) => {
    setSelectedCustomers(prev => prev.map(s => s.profile.id === customerId ? { ...s, message: newMessage } : s))
  }

  const refineTone = async (customerId: string) => {
    const sc = selectedCustomers.find(s => s.profile.id === customerId)
    if (!sc?.message) return
    setRefiningTone(customerId)
    try {
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal: `Refine this WhatsApp message to sound warmer, more friendly and conversational while keeping the same core content and all emojis. Keep under 200 words. Output ONLY the refined message text, nothing else:\n\n${sc.message}`,
          language,
        }),
      })
      if (response.ok) {
        const data = await response.json()
        if (data.message) {
          updateMessage(customerId, stripUrlsFromText(data.message))
          toast.success("消息语气已优化 ✨")
        }
      }
    } catch {
      toast.error("优化失败，请重试")
    } finally {
      setRefiningTone(null)
    }
  }

  // ── Computed ──
  const analyzedCount = selectedCustomers.filter(sc => sc.analysis !== null).length
  const readyToSendCount = selectedCustomers.filter(sc => sc.analysis && !sc.messageSent && sc.profile.phone).length

  const getAiRecommendationText = (sc: SelectedCustomer): string => {
    const a = sc.analysis
    if (!a) return ""
    const firstName = sc.profile.full_name?.split(" ")[0] || "此客户"
    if (a.hasBirthday)
      return `${firstName} 的生日即将到来——个性化生日优惠的转化率是标准促销的 3 倍。`
    if (a.daysSinceLastVisit > 60)
      return `${firstName} 已 ${a.daysSinceLastVisit} 天未到访，属于高流失风险。带时效折扣的高价值召回策略效果最佳。`
    if (a.daysSinceLastVisit > 30)
      return `${a.daysSinceLastVisit} 天未到访，正进入高风险区间。温暖的"我们想念您"消息搭配 10-15% 优惠，召回率可提升 15%。`
    if (a.daysSinceLastVisit > 7)
      return `${firstName} 已 ${a.daysSinceLastVisit} 天未到访，存在中等流失信号。此阶段轻量个性化触达效果更优。`
    if (a.membershipTier === "Diamond" || a.membershipTier === "Gold")
      return `${a.membershipTier} 会员，累计消费 RM${a.totalSpent.toFixed(0)}。忠诚度强化与专属预览优惠可深化品牌连接。`
    if (a.visitCount <= 2)
      return `新客户，仅 ${a.visitCount} 次到访。此刻通过欢迎礼提升第一印象，是当前价值最高的行动。`
    return `${firstName} 已到访 ${a.visitCount} 次，持有 ${a.pointsBalance} 积分。突出其积分权益及近期促销活动以维持参与度。`
  }

  const getMemberTier = (member: Profile): string => {
    const spent = member.total_spent || 0
    if (spent >= 5000) return "Diamond"
    if (spent >= 3000) return "Gold"
    if (spent >= 1000) return "Silver"
    return "Bronze"
  }

  const activeCustomerSC = selectedCustomers.find(sc => sc.profile.id === expandedCustomerId) ?? null
  const atRiskCount = selectedCustomers.filter(sc => sc.analysis?.isAtRisk).length
  const segmentHealth = analyzedCount === 0 ? "—"
    : atRiskCount > analyzedCount * 0.5 ? "At Risk"
    : atRiskCount > 0 ? "Moderate"
    : "Stable"
  const efficiencyGain = selectedCustomers.length === 0 ? 0
    : Math.round(analyzedCount / selectedCustomers.length * 100)
  const nextBestAction = analyzedCount === 0 ? "Run Analysis"
    : selectedCustomers.some(sc => sc.analysis?.hasBirthday) ? "Birthday Offer"
    : selectedCustomers.some(sc => sc.analysis && sc.analysis.daysSinceLastVisit > 60) ? "Win-Back"
    : selectedCustomers.some(sc => sc.analysis?.isAtRisk) ? "Re-Engage"
    : "Reinforce Loyalty"

  return (
    <div className="space-y-6">

      {/* ── Page header ── */}
      <div className="flex justify-between items-end flex-wrap gap-3">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground">Customer Analyzer</h2>
          <p className="text-muted-foreground mt-1 text-sm">识别客户群体，生成 AI 个性化互动策略</p>
        </div>
        <div className="flex items-center gap-3">
          {readyToSendCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={sendAllMessages}
              disabled={sendingAll}
              className="gap-2 text-green-600 border-green-500/40 hover:bg-green-50"
            >
              {sendingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {sendingAll ? "发送中..." : `Send All (${readyToSendCount})`}
            </Button>
          )}
          <Button
            onClick={runAutoGrouping}
            disabled={isGrouping || loading}
            className="gap-2 bg-[#8b6f47] hover:bg-[#7a5f3a] text-white"
          >
            {isGrouping ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Run Analysis
          </Button>
        </div>
      </div>

      {/* ── Main two-column grid ── */}
      <div className="grid grid-cols-12 gap-6">

        {/* ── Left: Target Segments (5 cols) ── */}
        <div className="col-span-12 lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-semibold text-base text-foreground">Target Segments</h3>
            {batches.length > 0 && (
              <span className="px-3 py-1 bg-[#8b6f47]/10 text-[#8b6f47] text-xs font-bold rounded-full tracking-wide">
                {batches.length} Groups Identified
              </span>
            )}
          </div>

          {loading || isGrouping ? (
            <div className="bg-white rounded-xl border border-border/30 shadow-sm p-10 flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#8b6f47]" />
              <p className="text-sm text-muted-foreground">{loading ? "正在加载客户数据..." : "AI 正在分析客户群体..."}</p>
            </div>
          ) : batches.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-border/50 shadow-sm p-10 flex flex-col items-center gap-3 text-center">
              <Brain className="w-10 h-10 text-muted-foreground/40" />
              <p className="font-medium text-foreground">尚未发现客户群体</p>
              <p className="text-sm text-muted-foreground">点击 "Run Analysis" 开始 AI 扫描</p>
            </div>
          ) : (
            <div className="space-y-3">
              {batches.map(batch => {
                const Icon = batch.icon
                const isExpanded = expandedBatches.has(batch.id)
                const selectedInBatch = batch.members.filter(m => isCustomerSelected(m.id)).length
                const allSelected = selectedInBatch === batch.members.length && batch.members.length > 0
                const someSelected = selectedInBatch > 0 && !allSelected
                const isActive = batch.members.some(m => m.id === expandedCustomerId)

                return (
                  <div
                    key={batch.id}
                    className={`bg-white rounded-xl shadow-sm transition-all ${
                      isActive
                        ? "border-2 border-[#8b6f47] ring-4 ring-[#8b6f47]/5"
                        : "border border-border/30 hover:border-[#8b6f47]/30"
                    }`}
                  >
                    {/* Card header */}
                    <div className="p-5 cursor-pointer" onClick={() => toggleBatchExpanded(batch.id)}>
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${batch.bgColor}`}>
                            <Icon className={`w-5 h-5 ${batch.color}`} />
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-bold text-base text-foreground">{batch.title}</h4>
                            <p className="text-muted-foreground text-sm mt-0.5 line-clamp-1">{batch.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <div className="bg-muted text-foreground font-bold text-lg px-3 py-1 rounded-lg">
                            {batch.members.length}
                          </div>
                          {isExpanded
                            ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                            : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                        </div>
                      </div>
                      <div className="flex gap-2 items-center flex-wrap">
                        {selectedInBatch > 0 && (
                          <span className="bg-[#8b6f47]/10 text-[#8b6f47] px-2.5 py-0.5 rounded-full text-xs font-bold">
                            {selectedInBatch} 已选
                          </span>
                        )}
                        <span className="bg-muted text-muted-foreground px-2.5 py-0.5 rounded-full text-xs">实时更新</span>
                        {isActive && (
                          <span className="bg-[#8b6f47]/10 text-[#8b6f47] px-2.5 py-0.5 rounded-full text-xs font-medium flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-[#8b6f47] rounded-full animate-pulse inline-block" />
                            Active
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Expanded customer list */}
                    {isExpanded && (
                      <div className="border-t border-border/20 px-5 py-4 space-y-1">
                        <div
                          className="flex items-center gap-3 pb-2.5 mb-1 border-b border-border/10 cursor-pointer"
                          onClick={(e) => { e.stopPropagation(); toggleBatchSelection(batch) }}
                        >
                          <Checkbox checked={allSelected} className={someSelected ? "opacity-60" : ""} />
                          <span className="text-xs font-semibold text-muted-foreground">全选此组</span>
                        </div>
                        {batch.members.map(m => {
                          const selected = isCustomerSelected(m.id)
                          const daysAgo = daysSince(m.last_visit)
                          const tier = getMemberTier(m)
                          const isActiveMember = m.id === expandedCustomerId
                          return (
                            <div
                              key={m.id}
                              className={`flex items-center justify-between py-2 px-2 rounded-lg cursor-pointer transition-colors ${
                                isActiveMember ? "bg-[#8b6f47]/8" : "hover:bg-muted/50"
                              }`}
                              onClick={(e) => { e.stopPropagation(); toggleCustomer(m) }}
                            >
                              <div className="flex items-center gap-3">
                                <Checkbox checked={selected} className="w-4 h-4" />
                                <div>
                                  <p className="font-semibold text-sm text-foreground">{m.full_name || t("ai", "caUnknown")}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {daysAgo >= 999 ? "从未到访" : daysAgo === 0 ? "今日到访" : `${daysAgo} 天前到访`}
                                  </p>
                                </div>
                              </div>
                              {tier !== "Bronze" && (
                                <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border ${
                                  tier === "Diamond" ? "bg-purple-50 text-purple-600 border-purple-200"
                                  : tier === "Gold" ? "bg-amber-50 text-amber-600 border-amber-200"
                                  : "bg-gray-50 text-gray-500 border-gray-200"
                                }`}>{tier}</span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Analyze selected button */}
          {selectedCustomers.length > 0 && (
            <div className="space-y-2 pt-1">
              {batchAnalyzing && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>AI 分析进度</span>
                    <span>{batchProgress.current} / {batchProgress.total}</span>
                  </div>
                  <Progress value={(batchProgress.current / batchProgress.total) * 100} className="h-1.5" />
                </div>
              )}
              <Button
                onClick={batchAnalyzeAndGenerate}
                className="w-full gap-2 bg-[#8b6f47] hover:bg-[#7a5f3a] text-white"
                disabled={batchAnalyzing}
              >
                {batchAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {batchAnalyzing
                  ? `分析中 ${batchProgress.current}/${batchProgress.total}...`
                  : `分析所选客户 (${selectedCustomers.length})`}
              </Button>
            </div>
          )}
        </div>

        {/* ── Right: AI Analysis Workspace (7 cols) ── */}
        <div className="col-span-12 lg:col-span-7">
          <div className="bg-white rounded-xl shadow-sm border border-border/20 flex flex-col" style={{ minHeight: 600 }}>

            {/* Header */}
            <div className="p-6 border-b border-border/10 flex items-center gap-4 bg-gray-50/60 rounded-t-xl">
              <div className="w-12 h-12 bg-[#8b6f47]/10 rounded-full flex items-center justify-center text-[#8b6f47] shrink-0">
                {activeCustomerSC?.isAnalyzing ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : activeCustomerSC?.messageSent ? (
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                ) : (
                  <Brain className="w-6 h-6" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-base truncate">
                  {activeCustomerSC ? activeCustomerSC.profile.full_name || "客户" : "Analysis & Strategy"}
                </h3>
                <p className="text-xs text-muted-foreground truncate">
                  {activeCustomerSC?.analysis
                    ? `${activeCustomerSC.analysis.membershipTier} · RM${activeCustomerSC.analysis.totalSpent.toFixed(0)} · ${activeCustomerSC.analysis.visitCount} 次 · ${activeCustomerSC.analysis.daysSinceLastVisit >= 999 ? "从未到访" : `${activeCustomerSC.analysis.daysSinceLastVisit}d 未到访`}`
                    : "从左侧选择客户以开始"}
                </p>
              </div>
            </div>

            {/* Body */}
            {!activeCustomerSC ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-5 p-12 text-center">
                <div className="w-20 h-20 rounded-full bg-muted/40 flex items-center justify-center">
                  <Brain className="w-10 h-10 text-muted-foreground/30" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-lg">Select Customer</p>
                  <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                    展开左侧客户群组并点击客户，AI 将自动生成个性化建议和消息
                  </p>
                </div>
              </div>
            ) : activeCustomerSC.isAnalyzing ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 p-12">
                <Loader2 className="w-10 h-10 animate-spin text-[#8b6f47]" />
                <p className="text-sm text-muted-foreground font-medium">AI 正在分析 {activeCustomerSC.profile.full_name}...</p>
                <p className="text-xs text-muted-foreground">生成个性化消息中，请稍候</p>
              </div>
            ) : !activeCustomerSC.analysis ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-5 p-12 text-center">
                <div className="w-20 h-20 rounded-full bg-[#8b6f47]/10 flex items-center justify-center">
                  <Sparkles className="w-10 h-10 text-[#8b6f47]" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-lg">{activeCustomerSC.profile.full_name} 已选中</p>
                  <p className="text-sm text-muted-foreground mt-1">点击左下方"分析所选客户"按钮生成 AI 建议与消息</p>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col p-8 gap-6">

                {/* AI RECOMMENDATION */}
                <div className="bg-[#8b6f47]/5 rounded-2xl p-6 border border-[#8b6f47]/10">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-4 h-4 text-[#8b6f47]" />
                    <span className="text-[11px] font-bold tracking-widest uppercase text-[#8b6f47]">
                      AI RECOMMENDATION
                    </span>
                  </div>
                  <p className="text-xl font-bold leading-snug text-foreground mb-4">
                    "{getAiRecommendationText(activeCustomerSC)}"
                  </p>
                  <div className="flex gap-x-4 gap-y-1.5 flex-wrap text-xs text-muted-foreground">
                    {activeCustomerSC.analysis.hasBirthday && <span className="text-pink-500 font-medium">🎂 生日优惠</span>}
                    {activeCustomerSC.analysis.isAtRisk && <span className="text-red-500 font-medium">⚠️ 流失风险</span>}
                    {activeCustomerSC.analysis.isVip && <span className="text-amber-500 font-medium">⭐ VIP 客户</span>}
                    {activeCustomerSC.voucher && (
                      <span className="text-green-600 font-medium">
                        🎫 含优惠券 ({activeCustomerSC.voucher.discount_value}{activeCustomerSC.voucher.discount_type === "percentage" ? "%" : " RM"})
                      </span>
                    )}
                    <span>RM{activeCustomerSC.analysis.totalSpent.toFixed(0)} 总消费</span>
                    <span>{activeCustomerSC.analysis.pointsBalance} 积分</span>
                  </div>
                </div>

                {/* Message Content Preview */}
                <div className="flex-1 space-y-2">
                  <label className="font-semibold text-base block">Message Content Preview</label>
                  <div className="relative">
                    <Textarea
                      value={activeCustomerSC.message}
                      onChange={(e) => updateMessage(activeCustomerSC.profile.id, e.target.value)}
                      rows={7}
                      className="w-full bg-muted/30 border-2 border-border/40 rounded-2xl p-5 text-sm focus:border-[#8b6f47] focus:ring-0 transition-colors resize-none pb-14"
                      placeholder="运行分析后将在此显示 AI 生成的消息..."
                    />
                    <div className="absolute bottom-4 right-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refineTone(activeCustomerSC.profile.id)}
                        disabled={refiningTone === activeCustomerSC.profile.id}
                        className="bg-white gap-1.5 text-xs h-8"
                      >
                        {refiningTone === activeCustomerSC.profile.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="w-3.5 h-3.5" />
                        )}
                        Refine Tone
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Send Button */}
                <div className="border-t border-border/10 pt-4 space-y-2">
                  <Button
                    className={`w-full py-5 text-base font-bold rounded-xl gap-2 transition-all ${
                      activeCustomerSC.messageSent
                        ? "bg-green-500 hover:bg-green-600"
                        : "bg-[#8b6f47] hover:bg-[#7a5f3a]"
                    } text-white`}
                    onClick={() => sendWhatsApp(activeCustomerSC.profile.id)}
                    disabled={activeCustomerSC.messageSent || !activeCustomerSC.profile.phone}
                  >
                    {activeCustomerSC.messageSent ? (
                      <><CheckCircle2 className="w-5 h-5" /> 已发送</>
                    ) : (
                      <><Send className="w-5 h-5" /> Send</>
                    )}
                  </Button>
                  {!activeCustomerSC.profile.phone && (
                    <p className="text-xs text-center text-muted-foreground">此客户无电话号码，无法发送 WhatsApp</p>
                  )}
                </div>

              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom Metrics Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-border/10 flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 rounded-full bg-[#8b6f47]/10 flex items-center justify-center text-[#8b6f47]">
            <Zap className="w-8 h-8" />
          </div>
          <div>
            <p className="text-[11px] font-bold tracking-widest uppercase text-muted-foreground mb-1">Efficiency Gain</p>
            <h4 className="text-4xl font-extrabold text-[#8b6f47]">
              {selectedCustomers.length === 0 ? "—" : `${efficiencyGain}%`}
            </h4>
            <p className="text-xs text-muted-foreground mt-2">AI 优化消息覆盖率</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-border/10 flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
            <TrendingDown className="w-8 h-8" />
          </div>
          <div>
            <p className="text-[11px] font-bold tracking-widest uppercase text-muted-foreground mb-1">Segment Health</p>
            <h4 className="text-4xl font-extrabold text-foreground">{segmentHealth}</h4>
            <p className="text-xs text-muted-foreground mt-2">
              {atRiskCount > 0
                ? `${atRiskCount} 位客户存在流失风险`
                : analyzedCount > 0 ? "客户群体状态良好" : "运行分析以评估健康度"}
            </p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-border/10 flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
            <Brain className="w-8 h-8" />
          </div>
          <div>
            <p className="text-[11px] font-bold tracking-widest uppercase text-muted-foreground mb-1">Next Best Action</p>
            <h4 className="text-3xl font-extrabold text-foreground">{nextBestAction}</h4>
            <p className="text-xs text-muted-foreground mt-2">基于 AI 客户数据分析</p>
          </div>
        </div>
      </div>

    </div>
  )
}
