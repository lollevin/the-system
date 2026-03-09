"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"
import { useLanguage } from "@/lib/i18n"
import { Plus, Share2, Users, Gift, Coins, Trash2, Edit, ToggleLeft, ToggleRight, Trophy, TrendingUp, Loader2 } from "lucide-react"

interface Campaign {
  id: string
  name: string
  description: string | null
  referrer_reward_type: "points" | "voucher"
  referrer_reward_value: number
  referrer_voucher_id: string | null
  referee_reward_type: "points" | "voucher"
  referee_reward_value: number
  referee_voucher_id: string | null
  max_referrals_per_user: number
  is_active: boolean
  start_date: string
  end_date: string | null
  created_at: string
}

interface ReferralStat {
  campaign_id: string
  total_referrals: number
  total_rewarded: number
}

export default function ReferralsPage() {
  const { t } = useLanguage()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [vouchers, setVouchers] = useState<any[]>([])
  const [stats, setStats] = useState<Record<string, ReferralStat>>({})
  const [totalReferrals, setTotalReferrals] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null)
  
  // Form state
  const [formName, setFormName] = useState("")
  const [formDesc, setFormDesc] = useState("")
  const [formReferrerType, setFormReferrerType] = useState<"points" | "voucher">("points")
  const [formReferrerValue, setFormReferrerValue] = useState(50)
  const [formReferrerVoucherId, setFormReferrerVoucherId] = useState("")
  const [formRefereeType, setFormRefereeType] = useState<"points" | "voucher">("points")
  const [formRefereeValue, setFormRefereeValue] = useState(20)
  const [formRefereeVoucherId, setFormRefereeVoucherId] = useState("")
  const [formMaxReferrals, setFormMaxReferrals] = useState(0)
  const [formEndDate, setFormEndDate] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setIsLoading(true)
    
    // Load campaigns
    const { data: campaignsData } = await supabase
      .from("referral_campaigns")
      .select("*")
      .order("created_at", { ascending: false })
    
    if (campaignsData) setCampaigns(campaignsData)

    // Load vouchers for dropdown
    const { data: vouchersData } = await supabase
      .from("vouchers")
      .select("id, name, code")
      .eq("is_active", true)
    
    if (vouchersData) setVouchers(vouchersData)

    // Load referral stats
    const { data: referralsData } = await supabase
      .from("referrals")
      .select("campaign_id, status")
    
    if (referralsData) {
      const statsMap: Record<string, ReferralStat> = {}
      referralsData.forEach(r => {
        if (!r.campaign_id) return
        if (!statsMap[r.campaign_id]) {
          statsMap[r.campaign_id] = { campaign_id: r.campaign_id, total_referrals: 0, total_rewarded: 0 }
        }
        statsMap[r.campaign_id].total_referrals++
        if (r.status === "rewarded") statsMap[r.campaign_id].total_rewarded++
      })
      setStats(statsMap)
      setTotalReferrals(referralsData.length)
    }

    setIsLoading(false)
  }

  const resetForm = () => {
    setFormName("")
    setFormDesc("")
    setFormReferrerType("points")
    setFormReferrerValue(50)
    setFormReferrerVoucherId("")
    setFormRefereeType("points")
    setFormRefereeValue(20)
    setFormRefereeVoucherId("")
    setFormMaxReferrals(0)
    setFormEndDate("")
    setEditingCampaign(null)
  }

  const openCreate = () => {
    resetForm()
    setShowCreateDialog(true)
  }

  const openEdit = (c: Campaign) => {
    setEditingCampaign(c)
    setFormName(c.name)
    setFormDesc(c.description || "")
    setFormReferrerType(c.referrer_reward_type)
    setFormReferrerValue(c.referrer_reward_value)
    setFormReferrerVoucherId(c.referrer_voucher_id || "")
    setFormRefereeType(c.referee_reward_type)
    setFormRefereeValue(c.referee_reward_value)
    setFormRefereeVoucherId(c.referee_voucher_id || "")
    setFormMaxReferrals(c.max_referrals_per_user)
    setFormEndDate(c.end_date ? c.end_date.split("T")[0] : "")
    setShowCreateDialog(true)
  }

  const handleSave = async () => {
    if (!formName.trim()) {
      toast.error(t("admin", "enterCampaignName"))
      return
    }
    
    setIsSaving(true)
    
    const payload = {
      name: formName.trim(),
      description: formDesc.trim() || null,
      referrer_reward_type: formReferrerType,
      referrer_reward_value: formReferrerType === "points" ? formReferrerValue : 0,
      referrer_voucher_id: formReferrerType === "voucher" && formReferrerVoucherId ? formReferrerVoucherId : null,
      referee_reward_type: formRefereeType,
      referee_reward_value: formRefereeType === "points" ? formRefereeValue : 0,
      referee_voucher_id: formRefereeType === "voucher" && formRefereeVoucherId ? formRefereeVoucherId : null,
      max_referrals_per_user: formMaxReferrals,
      end_date: formEndDate || null,
    }

    let error
    if (editingCampaign) {
      const res = await supabase.from("referral_campaigns").update(payload).eq("id", editingCampaign.id)
      error = res.error
    } else {
      const res = await supabase.from("referral_campaigns").insert(payload)
      error = res.error
    }

    if (error) {
      toast.error(error.message)
    } else {
      toast.success(editingCampaign ? t("admin", "campaignUpdated") : t("admin", "campaignCreated"))
      setShowCreateDialog(false)
      resetForm()
      loadData()
    }
    
    setIsSaving(false)
  }

  const toggleActive = async (campaign: Campaign) => {
    const { error } = await supabase
      .from("referral_campaigns")
      .update({ is_active: !campaign.is_active })
      .eq("id", campaign.id)
    
    if (error) {
      toast.error(error.message)
    } else {
      loadData()
    }
  }

  const deleteCampaign = async (id: string) => {
    if (!confirm(t("admin", "confirmDeleteCampaign"))) return
    
    const { error } = await supabase.from("referral_campaigns").delete().eq("id", id)
    if (error) {
      toast.error(error.message)
    } else {
      toast.success(t("admin", "campaignDeleted"))
      loadData()
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const activeCampaigns = campaigns.filter(c => c.is_active)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Share2 className="h-6 w-6 text-[#8b6f47]" />
            {t("admin", "shareAndEarn")}
          </h1>
          <p className="text-muted-foreground">{t("admin", "manageReferrals")}</p>
        </div>
        <Button onClick={openCreate} className="gap-2 bg-[#8b6f47] hover:bg-[#7a5f3a]">
          <Plus className="h-4 w-4" />
          {t("admin", "newCampaign")}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Trophy className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeCampaigns.length}</p>
              <p className="text-xs text-muted-foreground">{t("admin", "activeCampaigns")}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalReferrals}</p>
              <p className="text-xs text-muted-foreground">{t("admin", "totalReferrals")}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{campaigns.length}</p>
              <p className="text-xs text-muted-foreground">{t("admin", "totalCampaigns")}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Campaigns List */}
      {campaigns.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Share2 className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
            <h3 className="text-lg font-semibold mb-1">{t("admin", "noCampaignsYet")}</h3>
            <p className="text-muted-foreground text-sm mb-4">{t("admin", "createFirstCampaign")}</p>
            <Button onClick={openCreate} className="gap-2 bg-[#8b6f47] hover:bg-[#7a5f3a]">
              <Plus className="h-4 w-4" /> {t("admin", "createCampaign")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {campaigns.map(campaign => {
            const stat = stats[campaign.id]
            return (
              <Card key={campaign.id} className={!campaign.is_active ? "opacity-60" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg">{campaign.name}</h3>
                        <Badge variant={campaign.is_active ? "default" : "secondary"}>
                          {campaign.is_active ? t("admin", "active") : t("admin", "inactive")}
                        </Badge>
                      </div>
                      {campaign.description && (
                        <p className="text-sm text-muted-foreground mb-3">{campaign.description}</p>
                      )}
                      
                      {/* Rewards Info */}
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-500/10">
                          <p className="text-xs text-muted-foreground mb-0.5">{t("admin", "referrerGets")}</p>
                          <p className="font-semibold text-sm flex items-center gap-1">
                            {campaign.referrer_reward_type === "points" ? (
                              <><Coins className="h-3.5 w-3.5 text-blue-600" /> {campaign.referrer_reward_value} {t("common", "pts")}</>
                            ) : (
                              <><Gift className="h-3.5 w-3.5 text-blue-600" /> {t("customer", "voucher")}</>
                            )}
                          </p>
                        </div>
                        <div className="p-2 rounded-lg bg-green-50 dark:bg-green-500/10">
                          <p className="text-xs text-muted-foreground mb-0.5">{t("admin", "newUserGets")}</p>
                          <p className="font-semibold text-sm flex items-center gap-1">
                            {campaign.referee_reward_type === "points" ? (
                              <><Coins className="h-3.5 w-3.5 text-green-600" /> {campaign.referee_reward_value} {t("common", "pts")}</>
                            ) : (
                              <><Gift className="h-3.5 w-3.5 text-green-600" /> {t("customer", "voucher")}</>
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{stat?.total_referrals || 0} {t("admin", "referralsCount")}</span>
                        <span>{t("admin", "maxLabel")}: {campaign.max_referrals_per_user === 0 ? t("customer", "unlimited") : `${campaign.max_referrals_per_user}${t("admin", "perUser")}`}</span>
                        {campaign.end_date && (
                          <span>{t("admin", "endsOn")}: {new Date(campaign.end_date).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => toggleActive(campaign)} title={campaign.is_active ? t("admin", "deactivate") : t("admin", "activate")}>
                        {campaign.is_active ? <ToggleRight className="h-5 w-5 text-green-600" /> : <ToggleLeft className="h-5 w-5" />}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(campaign)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteCampaign(campaign.id)} className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCampaign ? t("admin", "editCampaign") : t("admin", "newReferralCampaign")}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">{t("admin", "campaignName")} *</label>
              <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder={t("admin", "campaignNamePlaceholder")} />
            </div>
            
            <div>
              <label className="text-sm font-medium">{t("admin", "campaignDescription")}</label>
              <Textarea value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder={t("admin", "optionalDesc")} rows={2} />
            </div>

            {/* Referrer Reward */}
            <div className="p-3 rounded-lg border bg-blue-50/50 dark:bg-blue-500/5 space-y-2">
              <p className="text-sm font-semibold text-blue-700 dark:text-blue-400">{t("admin", "referrerReward")}</p>
              <div className="flex gap-2">
                <Button size="sm" variant={formReferrerType === "points" ? "default" : "outline"} onClick={() => setFormReferrerType("points")}>
                  <Coins className="h-3.5 w-3.5 mr-1" /> {t("customer", "points")}
                </Button>
                <Button size="sm" variant={formReferrerType === "voucher" ? "default" : "outline"} onClick={() => setFormReferrerType("voucher")}>
                  <Gift className="h-3.5 w-3.5 mr-1" /> {t("customer", "voucher")}
                </Button>
              </div>
              {formReferrerType === "points" ? (
                <Input type="number" value={formReferrerValue} onChange={e => setFormReferrerValue(Number(e.target.value))} placeholder={t("admin", "pointsAmount")} />
              ) : (
                <select 
                  className="w-full h-9 px-3 rounded-md border bg-background text-sm"
                  value={formReferrerVoucherId} 
                  onChange={e => setFormReferrerVoucherId(e.target.value)}
                >
                  <option value="">{t("admin", "selectVoucher")}</option>
                  {vouchers.map(v => <option key={v.id} value={v.id}>{v.name} ({v.code})</option>)}
                </select>
              )}
            </div>

            {/* Referee Reward */}
            <div className="p-3 rounded-lg border bg-green-50/50 dark:bg-green-500/5 space-y-2">
              <p className="text-sm font-semibold text-green-700 dark:text-green-400">{t("admin", "refereeReward")}</p>
              <div className="flex gap-2">
                <Button size="sm" variant={formRefereeType === "points" ? "default" : "outline"} onClick={() => setFormRefereeType("points")}>
                  <Coins className="h-3.5 w-3.5 mr-1" /> {t("customer", "points")}
                </Button>
                <Button size="sm" variant={formRefereeType === "voucher" ? "default" : "outline"} onClick={() => setFormRefereeType("voucher")}>
                  <Gift className="h-3.5 w-3.5 mr-1" /> {t("customer", "voucher")}
                </Button>
              </div>
              {formRefereeType === "points" ? (
                <Input type="number" value={formRefereeValue} onChange={e => setFormRefereeValue(Number(e.target.value))} placeholder={t("admin", "pointsAmount")} />
              ) : (
                <select 
                  className="w-full h-9 px-3 rounded-md border bg-background text-sm"
                  value={formRefereeVoucherId} 
                  onChange={e => setFormRefereeVoucherId(e.target.value)}
                >
                  <option value="">{t("admin", "selectVoucher")}</option>
                  {vouchers.map(v => <option key={v.id} value={v.id}>{v.name} ({v.code})</option>)}
                </select>
              )}
            </div>

            {/* Limits */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">{t("admin", "maxPerUser")}</label>
                <Input type="number" value={formMaxReferrals} onChange={e => setFormMaxReferrals(Number(e.target.value))} />
              </div>
              <div>
                <label className="text-sm font-medium">{t("admin", "endDateOptional")}</label>
                <Input type="date" value={formEndDate} onChange={e => setFormEndDate(e.target.value)} />
              </div>
            </div>

            <Button onClick={handleSave} disabled={isSaving} className="w-full bg-[#8b6f47] hover:bg-[#7a5f3a]">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingCampaign ? t("admin", "updateCampaign") : t("admin", "createCampaign")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
