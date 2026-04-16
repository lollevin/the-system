"use client"

import React, { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Header } from "@/components/header"
import { CustomerSkeleton } from "@/components/customer-skeleton"
import { AnimatedGreeting } from "@/components/animated-greeting"
// StoryPromos removed
import { MembershipCard } from "@/components/membership-card"
import { QuickActions } from "@/components/quick-actions"
import { CheckIn } from "@/components/check-in"
import { QRCodeSection } from "@/components/qr-code-section"
import { HomeQRCard } from "@/components/home-qr-card"
import { ExclusiveOffers } from "@/components/exclusive-offers"
import { CustomerMenu } from "@/components/customer-menu"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ChevronLeft, Gift, History, Ticket, Coins, User, Users, Settings, HelpCircle, Mail, Phone, Loader2, LogOut, Bell, Megaphone, Star, PartyPopper, CheckCircle, QrCode, X, Globe, MessageCircle, Send, Home, Coffee } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { QRCodeSVG } from "qrcode.react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import type { User as SupabaseUser } from "@supabase/supabase-js"
import type { Profile } from "@/lib/supabase/types"
import { PromoModal, TopBanner } from "@/components/promo-modal"
import { useLanguage } from "@/lib/i18n"

interface CustomerAppProps {
  user: SupabaseUser
  profile: Profile
}

type ActiveView = "home" | "qr" | "vouchers" | "history" | "profile" | "settings" | "notifications" | "menu" | "support" | "referral"

export function CustomerApp({ user, profile: initialProfile }: CustomerAppProps) {
  const [profile, setProfile] = useState(initialProfile)
  const [activeView, setActiveView] = useState<ActiveView>("home")
  const [vouchers, setVouchers] = useState<any[]>([])
  const [usedVouchers, setUsedVouchers] = useState<any[]>([])
  const [rewards, setRewards] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [receivedMessages, setReceivedMessages] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [lastNotificationRead, setLastNotificationRead] = useState<Date | null>(null)
  const [selectedVoucherQR, setSelectedVoucherQR] = useState<any | null>(null)
  const [supportCategory, setSupportCategory] = useState("")
  const [supportMessage, setSupportMessage] = useState("")
  
  const supabase = createClient()
  const { language, setLanguage, t } = useLanguage()
  const searchParams = useSearchParams()
  const pendingVoucherCode = searchParams.get("code")

  // Handle deep link URL params (?view=vouchers&code=XX)
  useEffect(() => {
    const viewParam = searchParams.get("view") as ActiveView | null
    if (viewParam && ["home", "qr", "vouchers", "history", "profile", "settings", "notifications", "menu", "support", "referral"].includes(viewParam)) {
      setActiveView(viewParam)
    }
  }, [searchParams])

  // Auto-open voucher QR dialog when code param is present and vouchers are loaded
  useEffect(() => {
    if (pendingVoucherCode && vouchers.length > 0 && activeView === "vouchers") {
      const match = vouchers.find((v: any) => v.code === pendingVoucherCode)
      if (match) setSelectedVoucherQR(match)
    }
  }, [pendingVoucherCode, vouchers, activeView])

  // Load last notification read time from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(`lastNotificationRead_${user.id}`)
    if (stored) {
      setLastNotificationRead(new Date(stored))
    }
  }, [user.id])

  // Update last_visit and track session on mount
  useEffect(() => {
    // Update last_visit every time customer opens the app
    const updateLastVisit = async () => {
      await supabase
        .from("profiles")
        .update({ 
          last_visit: new Date().toISOString(),
        })
        .eq("id", user.id)
    }
    updateLastVisit()

    // Track session start time
    const sessionStart = Date.now()
    
    // Record session duration on unmount / tab close
    const recordSession = async () => {
      const durationSeconds = Math.floor((Date.now() - sessionStart) / 1000)
      if (durationSeconds >= 2) { // Only track if > 2 seconds
        try {
          await supabase
            .from("user_sessions")
            .insert({
              user_id: user.id,
              started_at: new Date(sessionStart).toISOString(),
              ended_at: new Date().toISOString(),
              duration_seconds: durationSeconds,
            })
        } catch (e) {
          // Silently fail - table might not exist yet
        }
      }
    }

    // Use beforeunload for tab close / navigate away
    const handleBeforeUnload = () => {
      const durationSeconds = Math.floor((Date.now() - sessionStart) / 1000)
      if (durationSeconds >= 2) {
        // Use sendBeacon for reliable delivery on page unload
        const payload = JSON.stringify({
          user_id: user.id,
          started_at: new Date(sessionStart).toISOString(),
          ended_at: new Date().toISOString(),
          duration_seconds: durationSeconds,
        })
        navigator.sendBeacon("/api/session", payload)
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload)

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
      recordSession()
    }
  }, [user.id])

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setIsLoading(true)
    
    // Refresh profile
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()
    
    if (profileData) setProfile(profileData)

    // Fetch user's active vouchers (unused, not expired)
    const { data: userVouchers } = await supabase
      .from("user_vouchers")
      .select(`*, voucher:vouchers(*)`)
      .eq("user_id", user.id)
      .eq("is_used", false)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })

    if (userVouchers) setVouchers(userVouchers)

    // Fetch user's used vouchers (for history)
    const { data: usedVouchers } = await supabase
      .from("user_vouchers")
      .select(`*, voucher:vouchers(*)`)
      .eq("user_id", user.id)
      .eq("is_used", true)
      .order("used_at", { ascending: false })
      .limit(20)

    if (usedVouchers) setUsedVouchers(usedVouchers)

    // Fetch available rewards (exclude personal/AI vouchers for other customers)
    const { data: rewardsData } = await supabase
      .from("vouchers")
      .select("*")
      .eq("is_active", true)
      .or(`voucher_type.is.null,voucher_type.neq.personal,target_customer_id.eq.${user.id}`)
      .order("points_required", { ascending: true })

    if (rewardsData) setRewards(rewardsData)

    // Fetch transactions
    const { data: txData } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50)

    if (txData) setTransactions(txData)

    // Fetch received messages (from admin/AI)
    const { data: messagesData } = await supabase
      .from("sent_messages")
      .select("*")
      .eq("customer_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20)

    if (messagesData) setReceivedMessages(messagesData)

    setIsLoading(false)
  }

  const handleCheckIn = () => {
    fetchData()
  }

  const handleRedeemReward = async (reward: any) => {
    if (profile.points_balance < reward.points_required) {
      toast.error(t("customer", "notEnoughPoints"))
      return
    }

    // Check if customer already has an UNUSED voucher for this reward
    const { data: existingVoucher } = await supabase
      .from("user_vouchers")
      .select("id, is_used")
      .eq("user_id", user.id)
      .eq("voucher_id", reward.id)
      .eq("is_used", false)
      .single()

    if (existingVoucher) {
      toast.error(t("customer", "alreadyHaveVoucher"), {
        description: t("customer", "useExistingFirst")
      })
      return
    }

    // Check max uses per customer limit
    const maxUses = reward.max_uses
    if (maxUses !== null && maxUses !== undefined) {
      // Count total redemptions (including used ones)
      const { count } = await supabase
        .from("user_vouchers")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("voucher_id", reward.id)

      if (count !== null && count >= maxUses) {
        toast.error(`${t("customer", "maxRedemptionReached")} (${maxUses}x ${t("customer", "perPersonLimit")})`)
        return
      }
    }

    // Generate unique voucher code: JP + timestamp + random string
    const code = `JP${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`
    
    const { error: voucherError } = await supabase.from("user_vouchers").insert({
      user_id: user.id,
      voucher_id: reward.id,
      code,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    })

    if (voucherError) {
      toast.error(t("customer", "redeemFailed"))
      return
    }

    await supabase.from("profiles").update({
      points_balance: profile.points_balance - reward.points_required,
    }).eq("id", user.id)

    await supabase.from("transactions").insert({
      user_id: user.id,
      type: "redeem",
      points: -reward.points_required,
      reason: `Redeemed: ${reward.name}`,
    })

    toast.success(t("customer", "redeemSuccess"), {
      description: `Code: ${code}`,
    })
    fetchData()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-MY', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Sub-page header component
  const SubPageHeader = ({ title, onBack }: { title: string; onBack: () => void }) => (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border">
      <div className="flex items-center justify-between px-4 py-3">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-secondary transition-colors">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <h1 className="font-semibold text-lg">{title}</h1>
        <div className="w-10" />
      </div>
    </header>
  )

  // QR Code View
  if (activeView === "qr") {
    return (
      <main className="min-h-screen bg-background">
        <div className="mx-auto max-w-md">
          <SubPageHeader title={t("customer", "memberQR")} onBack={() => setActiveView("home")} />
          <div className="p-6">
            <QRCodeSection profile={profile} userId={user.id} />
          </div>
        </div>
      </main>
    )
  }

  // Vouchers View
  if (activeView === "vouchers") {
    return (
      <main className="min-h-screen bg-background">
        <div className="mx-auto max-w-md">
          <SubPageHeader title={`${t("customer", "myVouchers")} & ${t("customer", "rewards")}`} onBack={() => setActiveView("home")} />
          <div className="p-4 space-y-6">
            {/* My Vouchers */}
            <div>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Ticket className="h-5 w-5 text-accent" />
                {t("customer", "myVouchers")} ({vouchers.length})
              </h2>
              {vouchers.length > 0 ? (
                <div className="space-y-3">
                  {vouchers.map((item) => (
                    <Card 
                      key={item.id} 
                      className="overflow-hidden cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => setSelectedVoucherQR(item)}
                    >
                      <CardContent className="p-0">
                        <div className="flex">
                          {/* QR Code Side */}
                          <div className="w-24 bg-white flex items-center justify-center p-2">
                            <QRCodeSVG 
                              value={item.code} 
                              size={72}
                              level="M"
                            />
                          </div>
                          <div className="flex-1 p-3">
                            <h4 className="font-semibold text-sm">{item.voucher?.name}</h4>
                            <p className="text-xs text-muted-foreground line-clamp-1">{item.voucher?.description}</p>
                            <div className="flex items-center justify-between mt-2">
                              <p className="text-xs text-primary font-mono bg-primary/10 px-2 py-0.5 rounded">{item.code}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(item.expires_at).toLocaleDateString()}
                              </p>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                              <QrCode className="h-3 w-3" />
                              {t("customer", "tapToShow")}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    <Ticket className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">{t("customer", "noVouchers")}</p>
                    <p className="text-sm">{t("customer", "earnPointsToRedeem")}</p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Used Vouchers History */}
            {usedVouchers.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <History className="h-5 w-5 text-muted-foreground" />
                  {t("customer", "used")} ({usedVouchers.length})
                </h2>
                <div className="space-y-3">
                  {usedVouchers.map((item) => (
                    <Card key={item.id} className="overflow-hidden opacity-60">
                      <CardContent className="p-0">
                        <div className="flex">
                          <div className="w-20 bg-muted flex items-center justify-center">
                            <CheckCircle className="h-8 w-8 text-green-500" />
                          </div>
                          <div className="flex-1 p-4">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold">{item.voucher?.name}</h4>
                              <Badge variant="secondary" className="text-xs">{t("customer", "used")}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{item.voucher?.description}</p>
                            <div className="flex items-center justify-between mt-2">
                              <p className="text-xs text-muted-foreground font-mono">{item.code}</p>
                              <p className="text-xs text-green-600">
                                {item.used_at ? new Date(item.used_at).toLocaleDateString() : "N/A"}
                              </p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Redeem Rewards */}
            <div>
              <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
                <Gift className="h-5 w-5 text-primary" />
                {t("customer", "rewards")}
              </h2>
              <p className="text-sm text-muted-foreground mb-3">
                {t("customer", "myPoints")}: <span className="font-semibold text-primary">{profile.points_balance}</span> {t("common", "pts")}
              </p>
              <div className="space-y-3">
                {rewards.map((reward) => {
                  const canRedeem = profile.points_balance >= reward.points_required
                  return (
                    <Card key={reward.id} className={!canRedeem ? "opacity-60" : ""}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`h-12 w-12 rounded-full flex items-center justify-center ${canRedeem ? "bg-gradient-to-br from-primary/20 to-accent/20" : "bg-muted"}`}>
                              <Gift className={`h-6 w-6 ${canRedeem ? "text-primary" : "text-muted-foreground"}`} />
                            </div>
                            <div>
                              <h4 className="font-semibold">{reward.name}</h4>
                              <p className="text-sm text-muted-foreground">{reward.description}</p>
                            </div>
                          </div>
                          <div className="text-right ml-3">
                            <p className={`font-bold text-lg ${canRedeem ? "text-primary" : "text-muted-foreground"}`}>
                              {reward.points_required}
                            </p>
                            <p className="text-xs text-muted-foreground">{t("common", "pts")}</p>
                            <Button
                              size="sm"
                              onClick={() => handleRedeemReward(reward)}
                              disabled={!canRedeem}
                              className="mt-2 rounded-full"
                            >
                              {canRedeem ? t("customer", "redeemNow") : t("customer", "notEnoughPoints")}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
                {rewards.length === 0 && (
                  <Card>
                    <CardContent className="p-8 text-center text-muted-foreground">
                      <Gift className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p>{t("customer", "noRewardsYet")}</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>

          {/* Voucher QR Dialog */}
          <Dialog open={!!selectedVoucherQR} onOpenChange={(open) => !open && setSelectedVoucherQR(null)}>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle className="text-center">{t("customer", "voucherQR")}</DialogTitle>
              </DialogHeader>
              {selectedVoucherQR && (
                <div className="flex flex-col items-center space-y-4 py-4">
                  {/* Large QR Code */}
                  <div className="bg-white p-4 rounded-xl shadow-lg">
                    <QRCodeSVG 
                      value={selectedVoucherQR.code} 
                      size={200}
                      level="H"
                      includeMargin
                    />
                  </div>
                  
                  {/* Voucher Info */}
                  <div className="text-center space-y-2">
                    <h3 className="font-bold text-lg">{selectedVoucherQR.voucher?.name}</h3>
                    <p className="text-muted-foreground text-sm">{selectedVoucherQR.voucher?.description}</p>
                    <div className="inline-block bg-primary/10 px-4 py-2 rounded-lg">
                      <p className="font-mono font-bold text-primary text-lg">{selectedVoucherQR.code}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t("customer", "expiresOn")}: {new Date(selectedVoucherQR.expires_at).toLocaleDateString()}
                    </p>
                  </div>

                  <p className="text-xs text-center text-muted-foreground bg-muted p-3 rounded-lg">
                    {t("customer", "showToStaff")}
                  </p>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </main>
    )
  }

  // History View
  if (activeView === "history") {
    return (
      <main className="min-h-screen bg-background">
        <div className="mx-auto max-w-md">
          <SubPageHeader title={t("customer", "transactionHistory")} onBack={() => setActiveView("home")} />
          <div className="p-4 space-y-2">
            {transactions.length > 0 ? (
              transactions.map((tx) => (
                <Card key={tx.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                        tx.type === "earn" ? "bg-green-100" : "bg-amber-100"
                      }`}>
                        {tx.type === "earn" ? (
                          <Coins className="h-5 w-5 text-green-600" />
                        ) : (
                          <Gift className="h-5 w-5 text-amber-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{tx.reason || (tx.type === "earn" ? t("customer", "earnedPoints") : t("customer", "redeemedPoints"))}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(tx.created_at)}</p>
                      </div>
                      <p className={`font-bold text-lg ${tx.points > 0 ? "text-green-600" : "text-amber-600"}`}>
                        {tx.points > 0 ? "+" : ""}{tx.points}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">{t("customer", "noTransactions")}</p>
                  <p className="text-sm">{t("customer", "startEarning")}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    )
  }

  // Menu View
  if (activeView === "menu") {
    return <CustomerMenu onBack={() => setActiveView("home")} />
  }

  // Settings View
  if (activeView === "settings") {
    return <SettingsView 
      user={user} 
      profile={profile} 
      onBack={() => setActiveView("home")} 
      onProfileUpdate={fetchData}
      SubPageHeader={SubPageHeader}
      language={language}
      setLanguage={setLanguage}
      t={t}
    />
  }

  // Notifications View
  if (activeView === "notifications") {
    // Build notifications from transactions AND received messages
    const allNotifications = [
      // Messages from admin/AI (promotions, birthday wishes, etc.)
      ...receivedMessages.map((msg) => ({
        id: `msg-${msg.id}`,
        type: 'message' as const,
        title: msg.message_type === 'birthday' ? '🎂 Birthday!' : 
               msg.message_type === 'promotion' ? '🎁 Special Offer!' : 
               msg.message_type === 'churn_risk' ? '👋 We Miss You!' : 
               '📬 JP&Co',
        message: msg.message_content?.slice(0, 100) + (msg.message_content?.length > 100 ? '...' : ''),
        fullMessage: msg.message_content,
        date: msg.created_at,
        points: null,
      })),
      // Transaction notifications
      ...transactions.slice(0, 10).map((tx) => ({
        id: `tx-${tx.id}`,
        type: tx.type === 'earn' ? 'points' as const : 'redeem' as const,
        title: tx.type === 'earn' ? `${t("customer", "earnedPoints")}!` : t("customer", "redeemedPoints"),
        message: tx.reason || (tx.type === 'earn' ? `+${tx.points} ${t("common", "pts")}` : `-${Math.abs(tx.points)} ${t("common", "pts")}`),
        fullMessage: null,
        date: tx.created_at,
        points: tx.points,
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return (
      <main className="min-h-screen bg-background">
        <div className="mx-auto max-w-md">
          <SubPageHeader title={t("customer", "notifications")} onBack={() => setActiveView("home")} />
          <div className="p-4 space-y-3">
            {/* Welcome notification (always shown) */}
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <PartyPopper className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{t("customer", "welcome")} JP&Co!</p>
                    <p className="text-sm text-muted-foreground">
                      {t("customer", "startEarning")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Dynamic notifications */}
            {allNotifications.length > 0 ? (
              allNotifications.map((notif) => (
                <Card key={notif.id} className={notif.type === 'message' ? 'border-amber-500/30' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${
                        notif.type === 'message' ? 'bg-amber-100' :
                        notif.type === 'points' ? 'bg-green-100' : 'bg-purple-100'
                      }`}>
                        {notif.type === 'message' ? (
                          <Megaphone className="h-5 w-5 text-amber-600" />
                        ) : notif.type === 'points' ? (
                          <Coins className="h-5 w-5 text-green-600" />
                        ) : (
                          <Gift className="h-5 w-5 text-purple-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold">{notif.title}</p>
                          {notif.points !== null && (
                            <span className={`font-bold ${notif.points > 0 ? 'text-green-600' : 'text-purple-600'}`}>
                              {notif.points > 0 ? '+' : ''}{notif.points}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground whitespace-pre-line">{notif.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">{formatDate(notif.date)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  <Bell className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">{t("customer", "noNotifications")}</p>
                  <p className="text-sm">{t("customer", "checkBackLater")}</p>
                </CardContent>
              </Card>
            )}

            {/* Promo notification */}
            {rewards.length > 0 && (
              <Card className="border-accent/30 bg-accent/5">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
                      <Megaphone className="h-5 w-5 text-accent" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">{t("customer", "newRewardsAvailable")}</p>
                      <p className="text-sm text-muted-foreground">
                        {rewards.length} {t("customer", "rewardsWaiting")} {rewards[0]?.points_required} {t("customer", "pointsUnit")}!
                      </p>
                      <Button 
                        size="sm" 
                        className="mt-2"
                        onClick={() => setActiveView("vouchers")}
                      >
                        {t("customer", "viewRewards")}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    )
  }

  // Referral / Share & Earn View
  if (activeView === "referral") {
    return <ReferralView user={user} profile={profile} onBack={() => setActiveView("home")} SubPageHeader={SubPageHeader} t={t} />
  }

  // Support View
  if (activeView === "support") {
    const SUPPORT_PHONE = "60173599349" // JP&Co customer service WhatsApp number
    
    const supportCategories = [
      { value: "points", label: t("customer", "supportPoints") },
      { value: "voucher", label: t("customer", "supportVoucher") },
      { value: "account", label: t("customer", "supportAccount") },
      { value: "menu", label: t("customer", "supportMenu") },
      { value: "other", label: t("customer", "supportOther") },
    ]
    
    const handleSendSupport = () => {
      if (!supportCategory || !supportMessage.trim()) {
        toast.error(t("customer", "supportFillAll"))
        return
      }
      
      const categoryLabel = supportCategories.find(c => c.value === supportCategory)?.label || supportCategory
      const memberInfo = `${profile.full_name || "Member"} (${profile.phone || profile.email || user.id.slice(0, 8)})`
      
      const fullMessage = [
        `🆘 *JP&Co Support Request*`,
        ``,
        `👤 *Customer:* ${memberInfo}`,
        `🆔 *Member ID:* ${user.id.slice(0, 8)}`,
        `📋 *Category:* ${categoryLabel}`,
        `💬 *Message:*`,
        supportMessage.trim(),
      ].join("\n")
      
      const encoded = encodeURIComponent(fullMessage)
      window.open(`https://wa.me/${SUPPORT_PHONE}?text=${encoded}`, "_blank")
      
      toast.success(t("customer", "supportSent"))
      setSupportCategory("")
      setSupportMessage("")
    }
    
    return (
      <main className="min-h-screen bg-background">
        <div className="mx-auto max-w-md">
          <SubPageHeader title={t("customer", "support")} onBack={() => setActiveView("home")} />
          <div className="p-4 space-y-5">
            {/* Info Card */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-1">
                  <div className="h-10 w-10 rounded-full bg-[#25D366]/10 flex items-center justify-center">
                    <MessageCircle className="h-5 w-5 text-[#25D366]" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{t("customer", "supportTitle")}</h3>
                    <p className="text-xs text-muted-foreground">{t("customer", "supportDesc")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Your Info (auto-filled) */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">{t("customer", "supportYourInfo")}</label>
              <Card>
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-bold text-primary">{profile.full_name?.[0]?.toUpperCase() || "?"}</span>
                    </div>
                    <div className="text-sm">
                      <p className="font-medium">{profile.full_name || "Member"}</p>
                      <p className="text-xs text-muted-foreground">{profile.phone || profile.email || `ID: ${user.id.slice(0, 8)}`}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Category Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">{t("customer", "supportCategoryLabel")}</label>
              <div className="grid grid-cols-2 gap-2">
                {supportCategories.map(cat => (
                  <button
                    key={cat.value}
                    onClick={() => setSupportCategory(cat.value)}
                    className={`p-3 rounded-xl border text-sm font-medium transition-all ${
                      supportCategory === cat.value
                        ? "bg-primary/10 border-primary text-primary"
                        : "bg-card border-border text-foreground hover:border-primary/50"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Problem Description */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">{t("customer", "supportProblemLabel")}</label>
              <Textarea
                placeholder={t("customer", "supportProblemPlaceholder")}
                value={supportMessage}
                onChange={(e) => setSupportMessage(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>

            {/* Send Button */}
            <Button
              onClick={handleSendSupport}
              disabled={!supportCategory || !supportMessage.trim()}
              className="w-full h-14 text-lg font-semibold bg-[#25D366] hover:bg-[#20BD5B] text-white rounded-xl gap-2 disabled:opacity-50"
            >
              <Send className="size-5" />
              {t("customer", "supportSendBtn")}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              {t("customer", "supportWhatsAppNote")}
            </p>
          </div>
        </div>
      </main>
    )
  }

  // Profile View
  if (activeView === "profile") {
    const hasRealEmail = Boolean(profile.email && !profile.email.endsWith("@jpco-member.com"))
    
    return (
      <main className="min-h-screen bg-background">
        <div className="mx-auto max-w-md">
          <SubPageHeader title={t("customer", "myProfile")} onBack={() => setActiveView("home")} />
          <div className="p-4 space-y-4">
            {/* Profile Info Card */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                    <span className="text-2xl font-bold text-white">
                      {profile.full_name?.[0]?.toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">{profile.full_name || "Member"}</h3>
                    {hasRealEmail && <p className="text-sm text-muted-foreground">{profile.email}</p>}
                    {profile.phone && <p className="text-sm text-muted-foreground">{profile.phone}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">{profile.points_balance || 0}</p>
                    <p className="text-xs text-muted-foreground">{t("customer", "points")}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">{profile.visit_count || 0}</p>
                    <p className="text-xs text-muted-foreground">{t("customer", "visits")}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">RM{profile.total_spent || 0}</p>
                    <p className="text-xs text-muted-foreground">{t("customer", "spent")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Links */}
            <div className="space-y-2">
              <button 
                onClick={() => setActiveView("settings")}
                className="w-full flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:bg-secondary/50 transition-colors"
              >
                <Settings className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">{t("common", "settings")}</span>
                <ChevronLeft className="h-5 w-5 ml-auto rotate-180 text-muted-foreground" />
              </button>
            </div>
          </div>
        </div>
      </main>
    )
  }

  // Calculate notification count (unread notifications)
  const calculateUnreadCount = () => {
    const readTime = lastNotificationRead?.getTime() || 0
    
    // Count unread transactions
    const unreadTransactions = transactions.filter(tx => {
      const txTime = new Date(tx.created_at).getTime()
      return txTime > readTime
    }).length

    // Count unread messages
    const unreadMessages = receivedMessages.filter(msg => {
      const msgTime = new Date(msg.created_at).getTime()
      return msgTime > readTime
    }).length

    return unreadTransactions + unreadMessages
  }

  const notificationCount = calculateUnreadCount()

  // Mark notifications as read
  const handleNotificationClick = () => {
    const now = new Date()
    setLastNotificationRead(now)
    localStorage.setItem(`lastNotificationRead_${user.id}`, now.toISOString())
    setActiveView("notifications")
  }

  // Show skeleton while loading
  if (isLoading && activeView === "home") {
    return <CustomerSkeleton />
  }

  // Home View
  return (
    <main className="min-h-screen bg-background pb-8">
      <PromoModal />
      <div className="mx-auto max-w-md sm:max-w-lg">
        <Header 
          profile={profile} 
          notificationCount={notificationCount}
          onNotificationClick={handleNotificationClick}
          onAvatarClick={() => setActiveView("settings")}
        />
        <TopBanner />
        <div className="flex flex-col gap-3.5 px-4 py-3 stagger-children">
          <AnimatedGreeting profile={profile} vouchers={vouchers} t={t} />
          <MembershipCard profile={profile} />
          <QuickActions 
            onShowQR={() => setActiveView("qr")}
            onShowVouchers={() => setActiveView("vouchers")}
            onShowHistory={() => setActiveView("history")}
            onShowProfile={() => setActiveView("profile")}
            onShowMenu={() => setActiveView("menu")}
            onShowSupport={() => setActiveView("support")}
            onShowReferral={() => setActiveView("referral")}
          />
          {/* QR Code Card - Easy access for staff to scan */}
          <HomeQRCard 
            profile={profile} 
            userId={user.id} 
            onClick={() => setActiveView("qr")}
          />
          <CheckIn userId={user.id} onCheckIn={handleCheckIn} />
          <ExclusiveOffers 
            profile={profile}
            vouchers={vouchers}
            rewards={rewards}
            onShowVouchers={() => setActiveView("vouchers")}
          />
        </div>
      </div>
    </main>
  )
}

// Settings View Component
interface SettingsViewProps {
  user: SupabaseUser
  profile: Profile
  onBack: () => void
  onProfileUpdate: () => void
  SubPageHeader: React.ComponentType<{ title: string; onBack: () => void }>
  language: "en" | "zh" | "ms"
  setLanguage: (lang: "en" | "zh" | "ms") => void
  t: (category: "common" | "customer" | "staff" | "admin" | "login" | "settings", key: string) => string
}

function SettingsView({ user, profile, onBack, onProfileUpdate, SubPageHeader, language, setLanguage, t }: SettingsViewProps) {
  const [fullName, setFullName] = useState(profile.full_name || "")
  const [phone, setPhone] = useState(profile.phone || "")
  const [email, setEmail] = useState("")
  const [birthday, setBirthday] = useState(profile.birthday || "")
  const [isLoading, setIsLoading] = useState(false)
  const [isLogoutLoading, setIsLogoutLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  
  // Check if user has a real email (not the generated one)
  const hasRealEmail = Boolean(profile.email && !profile.email.endsWith("@jpco-member.com"))
  const currentEmail = hasRealEmail ? profile.email : ""

  useEffect(() => {
    if (currentEmail) {
      setEmail(currentEmail)
    }
  }, [currentEmail])

  const handleSaveProfile = async () => {
    if (!fullName.trim()) {
      toast.error("Please enter your name")
      return
    }

    setIsLoading(true)

    try {
      // Update profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          phone: phone,
          birthday: birthday || null,
        })
        .eq("id", user.id)

      if (profileError) throw profileError

      toast.success("Profile updated!")
      onProfileUpdate()
    } catch (error: any) {
      toast.error(error.message || "Failed to update profile")
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddEmail = async () => {
    if (!email.trim()) {
      toast.error("Please enter an email address")
      return
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      toast.error("Please enter a valid email address")
      return
    }

    setIsLoading(true)

    try {
      // Update the auth user's email
      const { error: authError } = await supabase.auth.updateUser({
        email: email,
      })

      if (authError) throw authError

      // Update profile email
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          email: email,
        })
        .eq("id", user.id)

      if (profileError) throw profileError

      toast.success("Email added successfully!", {
        description: "You can now use this email to login",
      })
      onProfileUpdate()
    } catch (error: any) {
      toast.error(error.message || "Failed to add email")
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = async () => {
    setIsLogoutLoading(true)
    try {
      await supabase.auth.signOut()
      router.push("/login")
    } catch (error: any) {
      toast.error("Failed to logout")
    } finally {
      setIsLogoutLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-md">
        <SubPageHeader title={t("common", "settings")} onBack={onBack} />
        <div className="p-4 space-y-6">
          {/* Profile Settings */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <h3 className="font-semibold text-lg">{t("customer", "profile")}</h3>
              
              {/* Full Name */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">{t("customer", "fullName")}</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={t("customer", "fullName")}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">{t("customer", "phone")}</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder={t("customer", "phone")}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Birthday */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  {t("customer", "birthday")} 🎂
                </label>
                <Input
                  type="date"
                  value={birthday}
                  onChange={(e) => setBirthday(e.target.value)}
                  className="w-full"
                />
              </div>

              <Button 
                onClick={handleSaveProfile} 
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t("common", "loading")}
                  </>
                ) : (
                  t("common", "save")
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Language Settings */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-muted-foreground" />
                <h3 className="font-semibold text-lg">{t("common", "language")}</h3>
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant={language === "en" ? "default" : "outline"}
                  onClick={() => {
                    setLanguage("en")
                    toast.success("Language set to English")
                  }}
                  className={language === "en" ? "" : ""}
                >
                  English
                </Button>
                <Button
                  variant={language === "zh" ? "default" : "outline"}
                  onClick={() => {
                    setLanguage("zh")
                    toast.success("语言已设为中文")
                  }}
                >
                  中文
                </Button>
                <Button
                  variant={language === "ms" ? "default" : "outline"}
                  onClick={() => {
                    setLanguage("ms")
                    toast.success("Bahasa ditetapkan ke Melayu")
                  }}
                >
                  Melayu
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Email Settings */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <div>
                <h3 className="font-semibold text-lg">{t("customer", "emailSettings")}</h3>
                <p className="text-sm text-muted-foreground">
                  {hasRealEmail 
                    ? t("customer", "emailLoginEnabled")
                    : t("customer", "addEmailHint")}
                </p>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">{t("customer", "email")}</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="pl-10"
                    disabled={hasRealEmail}
                  />
                </div>
                {hasRealEmail && (
                  <p className="text-xs text-green-600">✓ {t("customer", "emailVerified")}</p>
                )}
              </div>

              {!hasRealEmail && (
                <Button 
                  onClick={handleAddEmail} 
                  disabled={isLoading || !email.trim()}
                  variant="outline"
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t("customer", "addingEmail")}
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-2" />
                      {t("customer", "addEmail")}
                    </>
                  )}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Logout */}
          <Card>
            <CardContent className="p-6">
              <Button 
                onClick={handleLogout}
                disabled={isLogoutLoading}
                variant="destructive"
                className="w-full"
              >
                {isLogoutLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t("customer", "loggingOut")}
                  </>
                ) : (
                  <>
                    <LogOut className="h-4 w-4 mr-2" />
                    {t("common", "logout")}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}

// ============================================
// Referral / Share & Earn View Component
// ============================================
interface ReferralViewProps {
  user: any
  profile: any
  onBack: () => void
  SubPageHeader: any
  t: (category: "customer" | "admin" | "staff" | "ai" | "common" | "login" | "settings", key: string) => string
}

function ReferralView({ user, profile, onBack, SubPageHeader, t }: ReferralViewProps) {
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [referrals, setReferrals] = useState<any[]>([])
  const [referralCode, setReferralCode] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null)
  const supabase = createClient()

  useEffect(() => {
    loadReferralData()
  }, [])

  const loadReferralData = async () => {
    setIsLoading(true)

    // Get user's referral code
    const { data: profileData } = await supabase
      .from("profiles")
      .select("referral_code")
      .eq("id", user.id)
      .single()
    
    if (profileData?.referral_code) {
      setReferralCode(profileData.referral_code)
    } else {
      const code = user.id.replace(/-/g, "").substring(0, 8).toUpperCase()
      setReferralCode(code)
      await supabase.from("profiles").update({ referral_code: code }).eq("id", user.id)
    }

    // Get ALL active campaigns
    const { data: campaignsData } = await supabase
      .from("referral_campaigns")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
    
    if (campaignsData) setCampaigns(campaignsData)

    // Get user's referrals
    const { data: referralsData } = await supabase
      .from("referrals")
      .select("*, referee:profiles!referrals_referee_id_fkey(full_name, created_at)")
      .eq("referrer_id", user.id)
      .order("created_at", { ascending: false })
    
    if (referralsData) setReferrals(referralsData)

    setIsLoading(false)
  }

  const buildShareLink = (campaignId?: string) => {
    const base = typeof window !== "undefined" ? window.location.origin : ""
    let link = `${base}/login?ref=${referralCode}`
    if (campaignId) link += `&camp=${campaignId}`
    return link
  }

  const handleShare = async (campaign: any) => {
    const link = buildShareLink(campaign.id)
    const shareText = campaign.description 
      ? `${campaign.name} - ${campaign.description}\n${link}`
      : `${campaign.name}\n${link}`

    if (navigator.share) {
      try {
        await navigator.share({
          title: campaign.name,
          text: shareText,
          url: link,
        })
      } catch {}
    } else {
      const { copyToClipboard } = await import("@/lib/utils")
      await copyToClipboard(link)
      toast.success(t("customer", "linkCopied"))
    }
  }

  const handleCopyCode = async () => {
    const { copyToClipboard } = await import("@/lib/utils")
    await copyToClipboard(referralCode)
    toast.success(t("customer", "linkCopied"))
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-background">
        <div className="mx-auto max-w-md">
          <SubPageHeader title={t("customer", "shareEarn")} onBack={onBack} />
          <div className="flex items-center justify-center h-48">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </div>
      </main>
    )
  }

  // Detail view for selected campaign
  if (selectedCampaign) {
    const shareLink = buildShareLink(selectedCampaign.id)
    return (
      <main className="min-h-screen bg-background">
        <div className="mx-auto max-w-md">
          <SubPageHeader title={selectedCampaign.name} onBack={() => setSelectedCampaign(null)} />
          <div className="p-4 space-y-4">
            {/* Campaign detail hero */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-[#6b4f2f] p-5 text-white">
              <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/10" />
              <div className="relative z-10">
                <Gift className="h-7 w-7 mb-2" />
                <h2 className="text-lg font-bold mb-1">{selectedCampaign.name}</h2>
                {selectedCampaign.description && (
                  <p className="text-sm text-white/80 mb-3">{selectedCampaign.description}</p>
                )}
                <div className="flex gap-2 flex-wrap">
                  <div className="bg-white/20 rounded-lg px-3 py-1.5 text-xs">
                    {t("customer", "youGet")}: {selectedCampaign.referrer_reward_type === "points" ? `${selectedCampaign.referrer_reward_value} pts` : t("customer", "voucher")}
                  </div>
                  <div className="bg-white/20 rounded-lg px-3 py-1.5 text-xs">
                    {t("customer", "friendGets")}: {selectedCampaign.referee_reward_type === "points" ? `${selectedCampaign.referee_reward_value} pts` : t("customer", "voucher")}
                  </div>
                </div>
              </div>
            </div>

            {/* Your code */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <p className="text-sm font-medium text-muted-foreground">{t("customer", "yourReferralCode")}</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-secondary rounded-xl px-4 py-3 text-center">
                    <span className="text-xl font-mono font-bold tracking-widest text-primary">{referralCode}</span>
                  </div>
                  <Button variant="outline" size="icon" className="shrink-0 h-12 w-12" onClick={handleCopyCode}>
                    <QrCode className="h-5 w-5" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* QR Code */}
            <Card>
              <CardContent className="p-4 flex flex-col items-center">
                <p className="text-sm font-medium text-muted-foreground mb-3">{t("customer", "scanToJoin")}</p>
                <div className="bg-white rounded-xl p-3 shadow-sm">
                  <QRCodeSVG value={shareLink} size={150} level="M" />
                </div>
              </CardContent>
            </Card>

            {/* Share button */}
            <Button 
              onClick={() => handleShare(selectedCampaign)}
              className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90 rounded-xl gap-2"
            >
              <Send className="size-5" />
              {t("customer", "shareNow")}
            </Button>
          </div>
        </div>
      </main>
    )
  }

  // Main list view
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-md">
        <SubPageHeader title={t("customer", "shareEarn")} onBack={onBack} />
        <div className="p-4 space-y-4">
          
          {/* Your referral code (compact) */}
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-primary/5 border border-primary/10">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <QrCode className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-muted-foreground">{t("customer", "yourReferralCode")}</p>
              <p className="text-sm font-bold font-mono tracking-wider text-primary">{referralCode}</p>
            </div>
            <Button variant="ghost" size="sm" className="text-xs shrink-0" onClick={handleCopyCode}>
              Copy
            </Button>
          </div>

          {/* Available campaigns to share */}
          <div>
            <h3 className="font-semibold mb-3 text-sm">{t("customer", "shareEarnDesc")}</h3>
            {campaigns.length > 0 ? (
              <div className="space-y-3">
                {campaigns.map(campaign => (
                  <div 
                    key={campaign.id}
                    className="rounded-2xl border border-border bg-card overflow-hidden hover:shadow-md transition-shadow"
                  >
                    {/* Campaign header gradient */}
                    <div className="bg-gradient-to-r from-primary/10 to-amber-500/10 p-4 pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <h4 className="font-semibold text-foreground">{campaign.name}</h4>
                          {campaign.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{campaign.description}</p>
                          )}
                        </div>
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <Gift className="h-5 w-5 text-primary" />
                        </div>
                      </div>
                    </div>
                    
                    {/* Rewards info */}
                    <div className="px-4 py-3 space-y-2.5">
                      <div className="flex gap-2">
                        <div className="flex-1 text-center p-2 rounded-lg bg-blue-50 dark:bg-blue-500/10">
                          <p className="text-[10px] text-muted-foreground">{t("customer", "youGet")}</p>
                          <p className="text-sm font-bold text-blue-600">
                            {campaign.referrer_reward_type === "points" ? `${campaign.referrer_reward_value} pts` : t("customer", "voucher")}
                          </p>
                        </div>
                        <div className="flex-1 text-center p-2 rounded-lg bg-green-50 dark:bg-green-500/10">
                          <p className="text-[10px] text-muted-foreground">{t("customer", "friendGets")}</p>
                          <p className="text-sm font-bold text-green-600">
                            {campaign.referee_reward_type === "points" ? `${campaign.referee_reward_value} pts` : t("customer", "voucher")}
                          </p>
                        </div>
                      </div>
                      
                      {/* Actions */}
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1 rounded-xl text-xs h-9"
                          onClick={() => setSelectedCampaign(campaign)}
                        >
                          <QrCode className="h-3.5 w-3.5 mr-1.5" />
                          QR & Code
                        </Button>
                        <Button 
                          size="sm" 
                          className="flex-1 rounded-xl text-xs h-9 bg-primary hover:bg-primary/90"
                          onClick={() => handleShare(campaign)}
                        >
                          <Send className="h-3.5 w-3.5 mr-1.5" />
                          {t("customer", "shareNow")}
                        </Button>
                      </div>
                    </div>

                    {/* End date if present */}
                    {campaign.end_date && (
                      <div className="px-4 pb-3">
                        <p className="text-[10px] text-muted-foreground">
                          Expires: {new Date(campaign.end_date).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  <Gift className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No active campaigns right now</p>
                  <p className="text-xs mt-1">Check back soon for new offers to share!</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Referral History */}
          <div>
            <h3 className="font-semibold mb-3 text-sm">{t("customer", "myReferrals")} ({referrals.length})</h3>
            {referrals.length > 0 ? (
              <div className="space-y-2">
                {referrals.map(ref => (
                  <Card key={ref.id}>
                    <CardContent className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-green-500/10 flex items-center justify-center">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{ref.referee?.full_name || "Member"}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(ref.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-green-600">
                        {ref.referrer_rewarded ? t("customer", "rewarded") : t("customer", "pending")}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-xs">{t("customer", "noReferralsYet")}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
