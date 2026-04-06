"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { 
  Search, 
  Users, 
  Loader2,
  Brain,
  User,
  Gift,
  MessageSquare,
  Calendar,
  Coins,
  ShoppingBag,
  Clock,
  Ticket,
  Trash2,
  Send,
  Copy,
  CheckCircle2,
  AlertTriangle,
  Cake,
  Star,
  TrendingDown,
  Sparkles,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Edit,
  Save,
  MessageCircle
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
  id: string // empty string if not yet created in DB
  code: string
  name: string
  discount_type: "percentage" | "fixed"
  discount_value: number
  reason: string
  createdInDb: boolean // false = pending suggestion, true = saved to DB
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
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCustomers, setSelectedCustomers] = useState<SelectedCustomer[]>([])
  const [expandedCustomerId, setExpandedCustomerId] = useState<string | null>(null)
  const [batchAnalyzing, setBatchAnalyzing] = useState(false)
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 })
  const [editingVoucherId, setEditingVoucherId] = useState<string | null>(null)
  const [editVoucherValue, setEditVoucherValue] = useState<number>(0)
  const [editVoucherType, setEditVoucherType] = useState<"percentage" | "fixed">("percentage")
  
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
    }
  }

  // Select all
  const selectAll = () => {
    if (selectedCustomers.length === filteredCustomers.length) {
      setSelectedCustomers([])
      setExpandedCustomerId(null)
    } else {
      setSelectedCustomers(filteredCustomers.map(c => ({
        profile: c,
        analysis: null,
        message: "",
        voucher: null,
        isAnalyzing: false,
        messageSent: false
      })))
    }
  }

  // Analyze a single customer's data
  const analyzeCustomerData = async (customer: Profile): Promise<CustomerAnalysis> => {
    const today = new Date()
    
    const { data: transactions } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", customer.id)
      .order("created_at", { ascending: false })
      .limit(20)
    
    const { data: userVouchers } = await supabase
      .from("user_vouchers")
      .select("*, voucher:vouchers(*)")
      .eq("user_id", customer.id)
      .order("created_at", { ascending: false })
    
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

    // Fetch session data
    let totalSessions = 0
    let avgSessionSeconds = 0
    let lastSessionAt: string | null = null
    try {
      const { data: sessions } = await supabase
        .from("user_sessions")
        .select("*")
        .eq("user_id", customer.id)
        .order("started_at", { ascending: false })
        .limit(100)
      
      if (sessions && sessions.length > 0) {
        totalSessions = sessions.length
        const totalDuration = sessions.reduce((sum: number, s: any) => sum + (s.duration_seconds || 0), 0)
        avgSessionSeconds = Math.round(totalDuration / sessions.length)
        lastSessionAt = sessions[0].started_at
      }
    } catch {
      // Table might not exist yet
    }
    
    return {
      totalSpent,
      visitCount,
      lastVisit,
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
      totalSessions,
      avgSessionSeconds,
      lastSessionAt,
    }
  }

  // Call AI for a unique personalized message
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
          goal: `Generate a unique personalized WhatsApp message for customer "${customer.full_name}" (customer ${customerIndex + 1} of ${totalCustomers}):

Customer Profile:
- Name: ${customer.full_name}
- Days since last visit: ${analysis.daysSinceLastVisit}
- Total spent: RM${analysis.totalSpent}
- Points balance: ${analysis.pointsBalance}
- Membership tier: ${analysis.membershipTier}
- Visit count: ${analysis.visitCount}
- Average spend per visit: RM${analysis.avgSpend.toFixed(0)}
- Is birthday (within 7 days): ${analysis.hasBirthday}
- Is at risk (inactive 30+ days): ${analysis.isAtRisk}
- Active vouchers: ${analysis.vouchersActive}
- Vouchers used: ${analysis.vouchersUsed}
${previousContext}

Requirements:
- Keep under 200 words, friendly tone, use emojis
- Malaysia market (mix of English/Malay/Chinese is OK)
- Include specific data points from this customer's profile
- ONLY output the WhatsApp message text, nothing else
- Make this message feel truly personal to THIS specific customer
- IMPORTANT: Do NOT include any URL or link in the message text`,
          language,
          requestId: `${customer.id}-${Date.now()}`
        }),
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        console.error(`[AI Analyzer] API error for ${customer.full_name}:`, response.status, errData.error)
        return ""
      }

      const data = await response.json()
      if (data.message) {
        // Clean up: try to extract just the message part
        let msg = data.message
        // Remove markdown headers if present
        if (msg.includes("###")) {
          const match = msg.match(/### .*?\n\n([\s\S]*?)(?:\n---|\n\n---|$)/)
          if (match) msg = match[1].trim()
        }
        // Remove quotes if wrapped
        if (msg.startsWith('"') && msg.endsWith('"')) {
          msg = msg.slice(1, -1)
        }
        return msg
      }
    } catch (err: any) {
      console.error(`[AI Analyzer] Failed for ${customer.full_name}:`, err?.message || err)
    }
    return ""
  }

  // Fallback template message
  const getTemplateMessage = (customer: Profile, analysis: CustomerAnalysis): string => {
    if (analysis.hasBirthday) {
      return `🎂 Happy Birthday ${customer.full_name}!\n\nThank you for being a valued member! 🎉\nAs a birthday gift, enjoy 20% OFF this week!\n\nCome celebrate with us!\n\n- JP&Co Team ❤️`
    } else if (analysis.isAtRisk && analysis.daysSinceLastVisit > 60) {
      return `👋 Hey ${customer.full_name}!\n\nIt's been ${analysis.daysSinceLastVisit} days! We miss you! 😊\nSpecial come-back offer: 15% OFF your next order!\n\nYou have ${analysis.pointsBalance} points waiting!\n\n- JP&Co Team 🍔`
    } else if (analysis.isAtRisk) {
      return `🍔 Hey ${customer.full_name}!\n\nHaven't seen you in ${analysis.daysSinceLastVisit} days!\nJust for you: 10% OFF on your next visit!\n\nYou have ${analysis.pointsBalance} points!\n\n- JP&Co Team 🍟`
    } else if (analysis.isVip) {
      return `⭐ Hi ${customer.full_name}!\n\nThank you for being a ${analysis.membershipTier} member!\n💰 Total: RM${analysis.totalSpent.toFixed(0)}\n✨ Points: ${analysis.pointsBalance}\n\nKeep collecting for amazing rewards!\n\n- JP&Co Team ⭐`
    } else {
      return `🍔 Hi ${customer.full_name}!\n\nHope you're doing great!\n✨ Points: ${analysis.pointsBalance}\n📊 Visits: ${analysis.visitCount}\n\nCheck out our latest menu!\n\n- JP&Co Team 🍟`
    }
  }

  // Batch analyze & generate for all selected customers
  const batchAnalyzeAndGenerate = async () => {
    if (selectedCustomers.length === 0) {
      toast.error(t("ai", "caSelectFirst"))
      return
    }

    // Check WhatsApp connection - warn but don't block (user can still generate messages)
    const waConnected = await checkWhatsAppConnected()
    if (!waConnected) {
      toast.warning(t("ai", "caWaNotConnected"), {
        description: t("ai", "caStillGenerate"),
        duration: 5000,
      })
    }

    setBatchAnalyzing(true)
    setBatchProgress({ current: 0, total: selectedCustomers.length })
    
    const previousMessageSummaries: string[] = []
    const updated = [...selectedCustomers]

    for (let i = 0; i < updated.length; i++) {
      const sc = updated[i]
      
      // Mark as analyzing
      updated[i] = { ...sc, isAnalyzing: true }
      setSelectedCustomers([...updated])

      try {
        // Step 1: Analyze customer data
        const analysis = await analyzeCustomerData(sc.profile)
        
        // Step 2: Generate unique AI message
        let message = await callAIForUniqueMessage(
          sc.profile,
          analysis,
          i,
          updated.length,
          previousMessageSummaries
        )

        // Fallback to template if AI fails
        if (!message || message.length < 30) {
          message = getTemplateMessage(sc.profile, analysis)
        }

        // Track message theme for next AI call
        const theme = analysis.hasBirthday ? "birthday" 
          : analysis.isAtRisk ? `win-back(${analysis.daysSinceLastVisit}d)`
          : analysis.isVip ? `vip-${analysis.membershipTier}`
          : `regular(${analysis.visitCount}visits)`
        previousMessageSummaries.push(`${sc.profile.full_name}: ${theme}`)

        // Step 3: AI decides voucher
        let voucher: GeneratedVoucher | null = null
        let shouldCreateVoucher = false
        let voucherReason = ""
        let voucherName = ""
        let voucherDiscount = 10
        let voucherType: "percentage" | "fixed" = "percentage"

        if (analysis.hasBirthday) {
          shouldCreateVoucher = true
          voucherReason = "Birthday Special"
          voucherName = "Birthday Gift"
          voucherDiscount = 20
        } else if (analysis.daysSinceLastVisit > 60) {
          shouldCreateVoucher = true
          voucherReason = "Win-back: Inactive 60+ days"
          voucherName = "We Miss You"
          voucherDiscount = 15
        } else if (analysis.daysSinceLastVisit > 30) {
          shouldCreateVoucher = true
          voucherReason = "Win-back: Inactive 30+ days"
          voucherName = "Come Back Special"
          voucherDiscount = 10
        } else if (analysis.membershipTier === "Diamond") {
          shouldCreateVoucher = true
          voucherReason = "VIP Diamond Exclusive"
          voucherName = "Diamond Exclusive"
          voucherDiscount = 15
        } else if (analysis.visitCount <= 2) {
          shouldCreateVoucher = true
          voucherReason = "New customer welcome"
          voucherName = "Welcome Gift"
          voucherDiscount = 10
        }

        // Only SUGGEST voucher during analysis - NOT created in DB yet
        // Voucher will be created when admin clicks "Send"
        if (shouldCreateVoucher) {
          const code = `AI${Math.random().toString(36).substring(2, 8).toUpperCase()}`
          voucher = {
            id: "", // not yet created in DB
            code,
            name: voucherName,
            discount_type: voucherType,
            discount_value: voucherDiscount,
            reason: voucherReason,
            createdInDb: false, // pending - will be created on send
          }
          // Keep message clean (no raw links). Voucher redemption is handled by CTA payload.
          message += `\n\n🎫 A special member reward has been prepared for you.`
        }

        // Final cleanup: ensure no URLs and no link-like residue in chat text.
        message = stripUrlsFromText(message)

        updated[i] = {
          ...sc,
          analysis,
          message,
          voucher,
          isAnalyzing: false,
          messageSent: false
        }
      } catch {
        updated[i] = { ...sc, isAnalyzing: false }
        toast.error(`${t("ai", "caFailedAnalyze")} ${sc.profile.full_name}`)
      }

      setBatchProgress({ current: i + 1, total: updated.length })
      setSelectedCustomers([...updated])
    }

    setBatchAnalyzing(false)
    toast.success(`${t("ai", "caGeneratedMessages")} ${updated.length} ${t("ai", "caCustomers")}`)
    
    // Auto-expand first customer
    if (updated.length > 0) {
      setExpandedCustomerId(updated[0].profile.id)
    }
  }

  // Delete voucher for a customer
  const deleteVoucher = async (customerId: string) => {
    const sc = selectedCustomers.find(s => s.profile.id === customerId)
    if (!sc?.voucher) return

    try {
      // Only delete from DB if it was already created there
      if (sc.voucher.createdInDb && sc.voucher.id) {
        await supabase.from("user_vouchers").delete()
          .eq("voucher_id", sc.voucher.id)
          .eq("user_id", sc.profile.id)

        await supabase.from("vouchers").delete()
          .eq("id", sc.voucher.id)
      }

      // Always remove from local state and clean message
      setSelectedCustomers(prev => prev.map(s => 
        s.profile.id === customerId 
          ? { ...s, voucher: null, message: rebuildMessageWithoutVoucher(s.message, s.analysis, s.profile) }
          : s
      ))

      toast.success(t("ai", "voucherDeleted"))
    } catch {
      toast.error(t("ai", "deleteVoucherFailed"))
    }
  }

  // Start editing a voucher
  const startEditVoucher = (customerId: string) => {
    const sc = selectedCustomers.find(s => s.profile.id === customerId)
    if (!sc?.voucher) return
    setEditingVoucherId(customerId)
    setEditVoucherValue(sc.voucher.discount_value)
    setEditVoucherType(sc.voucher.discount_type)
  }

  // Save edited voucher
  const saveEditVoucher = async (customerId: string) => {
    const sc = selectedCustomers.find(s => s.profile.id === customerId)
    if (!sc?.voucher) return

    try {
      // Only update in database if already created there
      if (sc.voucher.createdInDb && sc.voucher.id) {
        const { error } = await supabase
          .from("vouchers")
          .update({
            discount_value: editVoucherValue,
            discount_type: editVoucherType,
          })
          .eq("id", sc.voucher.id)

        if (error) throw error
      }

      // Update local state (works for both pending and created vouchers)
      setSelectedCustomers(prev => prev.map(s => {
        if (s.profile.id === customerId && s.voucher) {
          const updatedVoucher = {
            ...s.voucher,
            discount_value: editVoucherValue,
            discount_type: editVoucherType,
          }
          // Update the voucher code in message too
          const oldVoucherText = `${s.voucher.discount_value}${s.voucher.discount_type === "percentage" ? "%" : " RM"}`
          const newVoucherText = `${editVoucherValue}${editVoucherType === "percentage" ? "%" : " RM"}`
          const updatedMessage = s.message.replace(oldVoucherText, newVoucherText)
          return { ...s, voucher: updatedVoucher, message: updatedMessage }
        }
        return s
      }))

      setEditingVoucherId(null)
      toast.success(t("ai", "caVoucherUpdated"))
    } catch {
      toast.error(t("ai", "caVoucherUpdateFailed"))
    }
  }

  // Update message for a specific customer
  const updateMessage = (customerId: string, newMessage: string) => {
    setSelectedCustomers(prev => prev.map(s => 
      s.profile.id === customerId ? { ...s, message: newMessage } : s
    ))
  }

  // Remove voucher traces and regenerate smart links without voucher CTA
  const rebuildMessageWithoutVoucher = (message: string, analysis: CustomerAnalysis | null, profile: Profile): string => {
    const cleaned = message
      .split("\n")
      .filter((line) => {
        const l = line.toLowerCase()
        if (!line.trim()) return true

        // Voucher copy / code / claim lines
        if (l.includes("voucher") || l.includes("优惠券")) return false
        if (l.includes("claim here") || l.includes("claim voucher") || l.includes("领取")) return false
        if (l.includes("view=vouchers") || l.includes("code=")) return false

        // Existing smart links to be regenerated for current context
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

  // Format phone for WhatsApp
  const formatPhone = (phone: string | null): string => {
    if (!phone) return ""
    const clean = phone.replace(/\D/g, '')
    if (clean.startsWith("60")) return clean
    if (clean.startsWith("0")) return "60" + clean.substring(1)
    return "60" + clean
  }

  const openWaFallback = (phone: string, message: string) => {
    if (!phone) return
    const waUrl = `https://wa.me/${phone}${message ? `?text=${encodeURIComponent(message)}` : ""}`
    window.open(waUrl, "_blank")
  }

  const urlRegex = /https?:\/\/[^\s]+/gi

  const stripUrlsFromText = (text: string): string => {
    const cleaned = text
      .replace(urlRegex, "")
      .split("\n")
      .map((line) => line.trimEnd())
      .filter((line) => {
        const l = line.toLowerCase().trim()
        if (!l) return true
        // Remove orphan CTA/link lines after URL stripping
        if (l.includes("claim here") || l.includes("claim voucher")) return false
        if (l.includes("voucher code")) return false
        if (l.includes("view points") || l.includes("check your rewards")) return false
        if (l.includes("see our menu")) return false
        if (l.includes("read more") || l.includes("查看更多")) return false
        if (l === "👉" || l === "🍽️" || l === "📱" || l === "🎫") return false
        if (l.endsWith(":")) return false
        return true
      })
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim()

    return cleaned
  }

  const buildSmartWhatsAppPayload = (sc: SelectedCustomer) => {
    const ctaUrl = null
    const ctaLabel = null

    const cleanedMessage = stripUrlsFromText(sc.message)
    // TEMP: Disabled image to avoid 413 Payload Too Large error
    // Re-enable after fixing Nginx: client_max_body_size 50M;
    const fixedImageUrl = null // was: process.env.NEXT_PUBLIC_WHATSAPP_FIXED_IMAGE_URL || "/images/jpco-voucher.png"

    // Visual style prompt for 302.AI image generation (disabled for now to avoid 413)
    const imagePrompt = null

    return {
      message: cleanedMessage,
      imageCaption: cleanedMessage,
      imageUrl: fixedImageUrl,
      ctaUrl,
      ctaLabel,
      imagePrompt,
    }
  }

  // Create voucher in database (called when sending)
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
        .select()
        .single()

      if (!error && voucherData) {
        await supabase.from("user_vouchers").insert({
          user_id: sc.profile.id,
          voucher_id: voucherData.id,
          code: sc.voucher.code,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          is_used: false
        })

        return {
          ...sc.voucher,
          id: voucherData.id,
          createdInDb: true,
        }
      }
    } catch (err) {
      console.error("Failed to create voucher:", err)
    }
    return sc.voucher
  }

  // Send WhatsApp for one customer (via WhatsApp service, not wa.me)
  const sendWhatsApp = async (customerId: string) => {
    const sc = selectedCustomers.find(s => s.profile.id === customerId)
    if (!sc) return
    const phone = formatPhone(sc.profile.phone)

    // Check WhatsApp connection first
    const isConnected = await checkWhatsAppConnected()
    if (!isConnected) {
      const fallbackText = sc.message || `Hi ${sc.profile.full_name || ""}`
      openWaFallback(phone, fallbackText)
      toast.warning(t("ai", "caWaNotConnectedSend"), {
        description: "Switched to wa.me manual send fallback.",
        duration: 5000,
      })
      return
    }

    
    try {
      // Step 1: Create voucher in DB if pending (only on send!)
      let updatedVoucher = sc.voucher
      if (sc.voucher && !sc.voucher.createdInDb) {
        updatedVoucher = await createVoucherInDb(sc)
        if (updatedVoucher?.createdInDb) {
          // Update local state with created voucher
          setSelectedCustomers(prev => prev.map(s => 
            s.profile.id === customerId ? { ...s, voucher: updatedVoucher } : s
          ))
        }
      }

      // Step 2: Send via WhatsApp service API
      const payload = buildSmartWhatsAppPayload(sc)
      const response = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          message: payload.message,
          imageCaption: payload.imageCaption,
          imageUrl: payload.imageUrl,
          imagePrompt: payload.imagePrompt,
          ctaUrl: payload.ctaUrl,
          ctaLabel: payload.ctaLabel,
        }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to send message")
      }

      setSelectedCustomers(prev => prev.map(s => 
        s.profile.id === customerId ? { ...s, messageSent: true, voucher: updatedVoucher } : s
      ))

      // Record in sent_messages
      try {
        await supabase.from("sent_messages").insert({
          customer_id: sc.profile.id,
          message_type: "ai_personalized",
          message_content: payload.message,
          channel: "whatsapp",
          status: "sent"
        })
      } catch {}

      toast.success(`${t("ai", "caMessageSentTo")} ${sc.profile.full_name}`)
    } catch (error: any) {
      const fallbackText = sc.message || `Hi ${sc.profile.full_name || ""}`
      openWaFallback(phone, fallbackText)
      toast.warning(`${t("ai", "caFailedSendTo")} ${sc.profile.full_name}`, {
        description: `${error.message || "Send failed"}. Switched to wa.me manual send fallback.`,
      })
    }
  }

  // Send All - send to all analyzed customers at once
  const [sendingAll, setSendingAll] = useState(false)
  
  const sendAllMessages = async () => {
    const toSend = selectedCustomers.filter(sc => sc.analysis && !sc.messageSent && sc.profile.phone)
    if (toSend.length === 0) {
      toast.error(t("ai", "caNoMessages"))
      return
    }

    const isConnected = await checkWhatsAppConnected()
    if (!isConnected) {
      toast.error(t("ai", "caWaNotConnectedSend"), {
        description: t("ai", "caScanQr"),
        duration: 5000,
      })
      return
    }

    setSendingAll(true)
    let successCount = 0
    let failCount = 0

    for (const sc of toSend) {
      try {
        // Create voucher if pending
        let updatedVoucher = sc.voucher
        if (sc.voucher && !sc.voucher.createdInDb) {
          updatedVoucher = await createVoucherInDb(sc)
        }

        const phone = formatPhone(sc.profile.phone)
        const payload = buildSmartWhatsAppPayload(sc)
        const response = await fetch("/api/whatsapp/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone,
            message: payload.message,
            imageCaption: payload.imageCaption,
            imageUrl: payload.imageUrl,
            imagePrompt: payload.imagePrompt,
            ctaUrl: payload.ctaUrl,
            ctaLabel: payload.ctaLabel,
          }),
        })

        const result = await response.json()
        if (!response.ok || !result.success) throw new Error(result.error)

        setSelectedCustomers(prev => prev.map(s => 
          s.profile.id === sc.profile.id ? { ...s, messageSent: true, voucher: updatedVoucher } : s
        ))

        try {
          await supabase.from("sent_messages").insert({
            customer_id: sc.profile.id,
            message_type: "ai_personalized",
            message_content: payload.message,
            channel: "whatsapp",
            status: "sent"
          })
        } catch {}

        successCount++
      } catch {
        failCount++
      }

      // Small delay between messages to avoid rate limiting
      await new Promise(r => setTimeout(r, 1500))
    }

    setSendingAll(false)
    if (failCount === 0) {
      toast.success(t("ai", "caAllSent"))
    } else {
      toast.warning(`${t("ai", "caSentFailed")} ${successCount}, ${t("ai", "caFailed")} ${failCount}`)
    }
  }

  const analyzedCount = selectedCustomers.filter(sc => sc.analysis !== null).length
  const sentCount = selectedCustomers.filter(sc => sc.messageSent).length
  const readyToSendCount = selectedCustomers.filter(sc => sc.analysis && !sc.messageSent && sc.profile.phone).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Brain className="w-6 h-6 text-[#8b6f47]" />
            {t("ai", "customerAnalyzer")}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t("ai", "caSelectMulti")}
          </p>
        </div>
        {selectedCustomers.length > 0 && (
          <Badge variant="outline" className="text-base px-4 py-1">
            {selectedCustomers.length} {t("ai", "caSelected")}
            {analyzedCount > 0 && ` · ${analyzedCount} ${t("ai", "caAnalyzed")}`}
            {sentCount > 0 && ` · ${sentCount} ${t("ai", "caSent")}`}
          </Badge>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Customer List */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-5 h-5" />
              {t("ai", "selectCustomer")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t("ai", "searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Select All / Clear */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedCustomers.length === filteredCustomers.length && filteredCustomers.length > 0}
                  onCheckedChange={selectAll}
                />
                <span className="text-sm">{t("ai", "caSelectAllBtn")}</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={loadCustomers} disabled={loading}>
                  <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                </Button>
                {selectedCustomers.length > 0 && (
                  <Button variant="outline" size="sm" onClick={() => { setSelectedCustomers([]); setExpandedCustomerId(null) }}>
                    {t("ai", "caClear")}
                  </Button>
                )}
              </div>
            </div>

            {/* Customer List */}
            <ScrollArea className="h-[400px]">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-[#8b6f47]" />
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredCustomers.map(customer => {
                    const isSelected = selectedCustomers.some(sc => sc.profile.id === customer.id)
                    const sc = selectedCustomers.find(s => s.profile.id === customer.id)
                    const daysInactive = customer.last_visit 
                      ? Math.floor((Date.now() - new Date(customer.last_visit).getTime()) / (1000 * 60 * 60 * 24))
                      : -1 // -1 means never visited
                    
                    return (
                      <div
                        key={customer.id}
                        onClick={() => toggleCustomer(customer)}
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${
                          isSelected 
                            ? "bg-[#8b6f47]/10 border-[#8b6f47]/50 shadow-sm" 
                            : "bg-card border-border hover:bg-muted/50 hover:border-[#8b6f47]/30"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox checked={isSelected} />
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            isSelected ? "bg-[#8b6f47] text-white" : "bg-secondary"
                          }`}>
                            <User className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium truncate">{customer.full_name || t("ai", "caUnknown")}</span>
                              {(customer.total_spent || 0) >= 1000 && (
                                <Star className="w-4 h-4 text-amber-500" />
                              )}
                              {(daysInactive > 30 || daysInactive === -1) && (
                                <AlertTriangle className="w-4 h-4 text-red-500" />
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{customer.phone || t("ai", "caNoPhone")}</span>
                              <span>·</span>
                              <span>{customer.points_balance || 0} pts</span>
                              <span>·</span>
                              {daysInactive >= 0 ? (
                                <span>{daysInactive === 0 ? t("ai", "caToday") : `${daysInactive}${t("ai", "caDaysAgo")}`}</span>
                              ) : (
                                <span className="text-muted-foreground italic">{t("ai", "caNever")}</span>
                              )}
                            </div>
                          </div>
                          {sc?.messageSent && (
                            <Badge className="bg-green-500 shrink-0">{t("ai", "sent")}</Badge>
                          )}
                          {sc?.analysis && !sc.messageSent && (
                            <Badge className="bg-[#8b6f47] shrink-0">{t("ai", "caAnalyzedBadge")}</Badge>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </ScrollArea>

            {/* Batch Analyze Button */}
            {selectedCustomers.length > 0 && (
              <div className="space-y-3">
                {batchAnalyzing && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{t("ai", "caAiProgress")}</span>
                      <span>{batchProgress.current} / {batchProgress.total}</span>
                    </div>
                    <Progress value={(batchProgress.current / batchProgress.total) * 100} />
                  </div>
                )}
                <Button 
                  onClick={batchAnalyzeAndGenerate} 
                  className="w-full gap-2 bg-[#8b6f47] hover:bg-[#7a5f3a]"
                  disabled={batchAnalyzing}
                >
                  {batchAnalyzing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  {t("ai", "caAnalyzeBtn")} ({selectedCustomers.length})
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right: AI Analysis Results */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#8b6f47]" />
                {t("ai", "aiAnalysisMessage")}
              </CardTitle>
              {readyToSendCount > 0 && (
                <Button
                  onClick={sendAllMessages}
                  disabled={sendingAll}
                  className="bg-green-500 hover:bg-green-600 text-white gap-2"
                  size="sm"
                >
                  {sendingAll ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {sendingAll ? t("ai", "caSending") : `${t("ai", "caSendAll")} (${readyToSendCount})`}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {selectedCustomers.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Brain className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="font-medium">{t("ai", "selectCustomerStart")}</p>
                <p className="text-sm mt-2">{t("ai", "caSelectPrompt")}</p>
              </div>
            ) : analyzedCount === 0 && !batchAnalyzing ? (
              <div className="text-center py-16 text-muted-foreground">
                <Sparkles className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="font-medium">{selectedCustomers.length} {t("ai", "caCustomersSelected")}</p>
                <p className="text-sm mt-2">{t("ai", "caClickAnalyze")}</p>
              </div>
            ) : (
              <ScrollArea className="h-[500px]">
                <div className="space-y-3">
                  {selectedCustomers.map((sc) => {
                    const isExpanded = expandedCustomerId === sc.profile.id

                    return (
                      <div
                        key={sc.profile.id}
                        className={`rounded-lg border transition-all ${
                          sc.messageSent 
                            ? "border-green-500/30 bg-green-500/5" 
                            : sc.analysis 
                              ? "border-[#8b6f47]/30 bg-[#8b6f47]/5"
                              : "border-border bg-card"
                        }`}
                      >
                        {/* Customer Header - Always visible */}
                        <div 
                          className="flex items-center justify-between p-3 cursor-pointer"
                          onClick={() => setExpandedCustomerId(isExpanded ? null : sc.profile.id)}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                              sc.messageSent ? "bg-green-500 text-white" 
                              : sc.analysis ? "bg-[#8b6f47] text-white" 
                              : "bg-muted"
                            }`}>
                              {sc.isAnalyzing ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : sc.messageSent ? (
                                <CheckCircle2 className="w-4 h-4" />
                              ) : (
                                <User className="w-4 h-4" />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{sc.profile.full_name}</span>
                                {sc.analysis && (
                                  <Badge variant="outline" className="text-xs">{sc.analysis.membershipTier}</Badge>
                                )}
                              </div>
                              {sc.analysis && (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  {sc.analysis.hasBirthday && <span className="text-pink-500">🎂 {t("ai", "caBirthday")}</span>}
                                  {sc.analysis.isAtRisk && <span className="text-red-500">⚠️ {t("ai", "caAtRisk")}</span>}
                                  {sc.analysis.isVip && <span className="text-amber-500">⭐ {t("ai", "caVIP")}</span>}
                                  {sc.voucher && <span className="text-green-500">🎫 {t("ai", "caVoucherLabel")}</span>}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {sc.analysis && !sc.messageSent && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => { e.stopPropagation(); sendWhatsApp(sc.profile.id) }}
                                disabled={!sc.profile.phone}
                              >
                                <Send className="w-4 h-4" />
                              </Button>
                            )}
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </div>
                        </div>

                        {/* Expanded Content */}
                        {isExpanded && sc.analysis && (
                          <div className="px-3 pb-3 space-y-3 border-t border-border/50 pt-3">
                            {/* Analysis Stats */}
                            <div className="grid grid-cols-3 gap-2 text-sm">
                              <div className="flex items-center gap-1.5">
                                <ShoppingBag className="w-3.5 h-3.5 text-muted-foreground" />
                                <span>RM{sc.analysis.totalSpent.toFixed(0)}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Coins className="w-3.5 h-3.5 text-muted-foreground" />
                                <span>{sc.analysis.pointsBalance} pts</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                                <span>
                                  {sc.analysis.daysSinceLastVisit >= 999 
                                    ? t("ai", "caNever") 
                                    : sc.analysis.daysSinceLastVisit === 0 
                                      ? t("ai", "caToday") 
                                      : `${sc.analysis.daysSinceLastVisit}${t("ai", "caDaysAgo")}`}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                                <span>{sc.analysis.visitCount} {t("ai", "caVisits")}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Ticket className="w-3.5 h-3.5 text-muted-foreground" />
                                <span>{sc.analysis.vouchersUsed} {t("ai", "caUsed")}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Gift className="w-3.5 h-3.5 text-muted-foreground" />
                                <span>{sc.analysis.vouchersActive} {t("ai", "caActive")}</span>
                              </div>
                              {sc.analysis.totalSessions > 0 && (
                                <>
                                  <div className="flex items-center gap-1.5">
                                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                                    <span>{sc.analysis.totalSessions} {t("ai", "caSessions")}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                                    <span>Avg {sc.analysis.avgSessionSeconds < 60 
                                      ? `${sc.analysis.avgSessionSeconds}s` 
                                      : `${Math.round(sc.analysis.avgSessionSeconds / 60)}min`}</span>
                                  </div>
                                </>
                              )}
                            </div>

                            {/* Status badges */}
                            <div className="flex gap-2 flex-wrap">
                              {sc.analysis.hasBirthday && (
                                <Badge className="bg-pink-500"><Cake className="w-3 h-3 mr-1" /> {t("ai", "birthday")}</Badge>
                              )}
                              {sc.analysis.isAtRisk && (
                                <Badge variant="destructive"><TrendingDown className="w-3 h-3 mr-1" /> {t("ai", "atRisk")}</Badge>
                              )}
                              {sc.analysis.isVip && (
                                <Badge className="bg-amber-500"><Star className="w-3 h-3 mr-1" /> {t("ai", "vip")}</Badge>
                              )}
                            </div>

                            {/* Voucher */}
                            {sc.voucher && (
                              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <Gift className="w-4 h-4 text-green-600" />
                                    <span className="font-medium text-green-600 text-sm">
                                      {sc.voucher?.createdInDb ? t("ai", "aiCreatedVoucher") : t("ai", "caAiVoucher")}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    {editingVoucherId === sc.profile.id ? (
                                      <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="text-green-600 hover:text-green-700 hover:bg-green-500/10 h-7"
                                        onClick={() => saveEditVoucher(sc.profile.id)}
                                      >
                                        <Save className="w-3 h-3 mr-1" />
                                        {t("ai", "caSave")}
                                      </Button>
                                    ) : (
                                      <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="text-blue-500 hover:text-blue-600 hover:bg-blue-500/10 h-7"
                                        onClick={() => startEditVoucher(sc.profile.id)}
                                      >
                                        <Edit className="w-3 h-3 mr-1" />
                                        {t("common", "edit")}
                                      </Button>
                                    )}
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className="text-red-500 hover:text-red-600 hover:bg-red-500/10 h-7"
                                      onClick={() => deleteVoucher(sc.profile.id)}
                                    >
                                      <Trash2 className="w-3 h-3 mr-1" />
                                      {t("common", "delete")}
                                    </Button>
                                  </div>
                                </div>
                                
                                {/* Editing mode */}
                                {editingVoucherId === sc.profile.id ? (
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-medium">{sc.voucher.name}</span>
                                    <span className="text-xs text-muted-foreground">·</span>
                                    <Input
                                      type="number"
                                      value={editVoucherValue}
                                      onChange={(e) => setEditVoucherValue(Number(e.target.value))}
                                      className="w-20 h-7 text-xs"
                                      min={1}
                                      max={editVoucherType === "percentage" ? 100 : 999}
                                    />
                                    <select
                                      value={editVoucherType}
                                      onChange={(e) => setEditVoucherType(e.target.value as "percentage" | "fixed")}
                                      className="h-7 text-xs rounded border border-input bg-background px-2"
                                    >
                                      <option value="percentage">{t("ai", "caPercentOff")}</option>
                                      <option value="fixed">{t("ai", "caRmOff")}</option>
                                    </select>
                                    <code className="bg-background px-1.5 py-0.5 rounded text-xs">{sc.voucher.code}</code>
                                  </div>
                                ) : (
                                  <div className="text-xs space-y-0.5">
                                    <p><strong>{sc.voucher.name}</strong> · <code className="bg-background px-1.5 py-0.5 rounded">{sc.voucher.code}</code> · {sc.voucher.discount_value}{sc.voucher.discount_type === "percentage" ? t("ai", "caPercentOff") : ` ${t("ai", "caRmOff")}`}</p>
                                    <p className="text-muted-foreground">{sc.voucher.reason}</p>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Message */}
                            {(() => {
                              const sendPack = buildSmartWhatsAppPayload(sc)
                              return (
                                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/25 text-xs space-y-1">
                                  <p className="font-medium text-blue-700">WhatsApp Send Package</p>
                                  <p>🖼️ Image: {sendPack.imageUrl ? "Fixed voucher image URL" : "AI generated campaign visual (302.AI)"}</p>
                                  <p>🔘 CTA: Disabled (as requested)</p>
                                  <p className="truncate">🔗 Link in chat: Disabled</p>
                                </div>
                              )
                            })()}

                            <div>
                              <label className="text-sm font-medium mb-1 block">{t("ai", "generatedMessage")}</label>
                              <Textarea
                                value={sc.message}
                                onChange={(e) => updateMessage(sc.profile.id, e.target.value)}
                                className="min-h-[150px] font-mono text-sm"
                              />
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="flex-1"
                                onClick={() => {
                                  import("@/lib/utils").then(({ copyToClipboard }) => copyToClipboard(sc.message))
                                  toast.success(t("ai", "copied"))
                                }}
                              >
                                <Copy className="w-4 h-4 mr-1" />
                                {t("ai", "copy")}
                              </Button>
                              <Button 
                                size="sm"
                                className={`flex-1 ${sc.messageSent ? "bg-green-500 hover:bg-green-600" : "bg-[#8b6f47] hover:bg-[#7a5f3a]"}`}
                                onClick={() => sendWhatsApp(sc.profile.id)}
                                disabled={sc.messageSent || !sc.profile.phone}
                              >
                                {sc.messageSent ? (
                                  <>
                                    <CheckCircle2 className="w-4 h-4 mr-1" />
                                    {t("ai", "sent")}
                                  </>
                                ) : (
                                  <>
                                    <Send className="w-4 h-4 mr-1" />
                                    {t("ai", "sendWhatsApp")}
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
