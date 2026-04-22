"use client"

import { useState, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { useLanguage } from "@/lib/i18n"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Gift, Plus, Edit, Trash2, Loader2, Users, Ticket, Info, Sparkles, Repeat, User, Search, Brain, Clock, Upload, X, Image as ImageIcon } from "lucide-react"
import { toast } from "sonner"
import type { Voucher } from "@/lib/supabase/types"

interface CustomerBasic {
  id: string
  full_name: string | null
  phone: string | null
}

interface RewardsManagerProps {
  initialVouchers: any[]
  customers: CustomerBasic[]
}

export function RewardsManager({ initialVouchers = [], customers = [] }: RewardsManagerProps) {
  const { t } = useLanguage()
  const [vouchers, setVouchers] = useState<any[]>(initialVouchers)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [editingVoucher, setEditingVoucher] = useState<any | null>(null)
  const [customerSearch, setCustomerSearch] = useState("")
  
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    description: "",
    points_required: 100,
    discount_type: "percentage" as "percentage" | "fixed",
    discount_value: 10,
    valid_days: 30,
    max_uses_per_customer: 1 as number | null,
    voucher_type: "global" as "global" | "personal",
    target_customer_id: "" as string,
    image_url: "" as string,
  })
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const supabase = createClient()

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith("image/")) { toast.error("Please upload an image"); return }
    if (file.size > 5 * 1024 * 1024) { toast.error("Max 5MB"); return }
    setIsUploadingImage(true)
    try {
      const reader = new FileReader()
      reader.onload = (ev) => setImagePreview(ev.target?.result as string)
      reader.readAsDataURL(file)
      const filePath = `voucher-images/voucher_${Date.now()}_${Math.random().toString(36).substring(7)}.${file.name.split(".").pop()}`
      const { error } = await supabase.storage.from("uploads").upload(filePath, file, { cacheControl: "3600", upsert: false })
      if (error) throw error
      const { data: urlData } = supabase.storage.from("uploads").getPublicUrl(filePath)
      setFormData(prev => ({ ...prev, image_url: urlData.publicUrl }))
      toast.success("Image uploaded")
    } catch (error: any) {
      toast.error(error.message || "Upload failed")
      setImagePreview(null)
    } finally {
      setIsUploadingImage(false)
    }
  }

  // Separate vouchers by type
  const globalVouchers = vouchers.filter(v => v.voucher_type === "global" || !v.voucher_type)
  const personalVouchers = vouchers.filter(v => v.voucher_type === "personal")

  // Filter customers for search
  const filteredCustomers = customers.filter(c => {
    if (!customerSearch) return true
    const q = customerSearch.toLowerCase()
    return c.full_name?.toLowerCase().includes(q) || c.phone?.includes(q)
  })

  const resetForm = () => {
    setFormData({
      code: "",
      name: "",
      description: "",
      points_required: 100,
      discount_type: "percentage",
      discount_value: 10,
      valid_days: 30,
      max_uses_per_customer: 1,
      voucher_type: "global",
      target_customer_id: "",
      image_url: "",
    })
    setEditingVoucher(null)
    setCustomerSearch("")
    setImagePreview(null)
  }

  const openCreateDialog = (type: "global" | "personal" = "global") => {
    resetForm()
    setFormData(prev => ({ 
      ...prev, 
      voucher_type: type,
      points_required: type === "personal" ? 0 : 100,
      max_uses_per_customer: type === "personal" ? 1 : 1,
    }))
    setIsDialogOpen(true)
  }

  const openEditDialog = (voucher: any) => {
    setEditingVoucher(voucher)
    setFormData({
      code: voucher.code,
      name: voucher.name,
      description: voucher.description || "",
      points_required: voucher.points_required,
      discount_type: voucher.discount_type,
      discount_value: voucher.discount_value,
      valid_days: 30,
      max_uses_per_customer: voucher.max_uses ?? 1,
      voucher_type: voucher.voucher_type || "global",
      target_customer_id: voucher.target_customer_id || "",
      image_url: voucher.image_url || "",
    })
    setImagePreview(voucher.image_url || null)
    setIsDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const validUntil = new Date()
      validUntil.setDate(validUntil.getDate() + formData.valid_days)

      if (formData.voucher_type === "personal" && !formData.target_customer_id && !editingVoucher) {
        toast.error(t("admin", "selectTargetCustomer"))
        setIsLoading(false)
        return
      }

      if (editingVoucher) {
        const { error } = await supabase
          .from("vouchers")
          .update({
            code: formData.code.toUpperCase(),
            name: formData.name,
            description: formData.description,
            points_required: formData.points_required,
            discount_type: formData.discount_type,
            discount_value: formData.discount_value,
            valid_until: validUntil.toISOString(),
            image_url: formData.image_url || null,
          })
          .eq("id", editingVoucher.id)

        if (error) throw error

        setVouchers(prev => prev.map(v => 
          v.id === editingVoucher.id 
            ? { ...v, ...formData, code: formData.code.toUpperCase(), valid_until: validUntil.toISOString() }
            : v
        ))
        toast.success(t("admin", "voucherUpdated"))
      } else {
        const code = formData.voucher_type === "personal" 
          ? `${formData.code || "VIP"}${Math.random().toString(36).substring(2, 6).toUpperCase()}`
          : formData.code.toUpperCase()

        const voucherData: any = {
          code,
          name: formData.name,
          description: formData.description,
          points_required: formData.points_required,
          discount_type: formData.discount_type,
          discount_value: formData.discount_value,
          valid_until: validUntil.toISOString(),
          is_active: true,
          max_uses: formData.max_uses_per_customer,
          voucher_type: formData.voucher_type,
          image_url: formData.image_url || null,
        }

        if (formData.voucher_type === "personal" && formData.target_customer_id) {
          voucherData.target_customer_id = formData.target_customer_id
          const targetCustomer = customers.find(c => c.id === formData.target_customer_id)
          voucherData.description = formData.description || `${t("admin", "exclusiveOffer")} - ${targetCustomer?.full_name || t("admin", "customerLabel")}`
        }
        
        const { data, error } = await supabase
          .from("vouchers")
          .insert(voucherData)
          .select("*, target_customer:profiles!vouchers_target_customer_id_fkey(id, full_name, phone)")
          .single()

        if (error) throw error

        // For personal vouchers, also add to user_vouchers so customer can see it
        if (formData.voucher_type === "personal" && formData.target_customer_id) {
          await supabase.from("user_vouchers").insert({
            user_id: formData.target_customer_id,
            voucher_id: data.id,
            code,
            expires_at: validUntil.toISOString(),
            is_used: false
          })
        }

        setVouchers(prev => [data, ...prev])
        
        if (formData.voucher_type === "personal") {
          const targetCustomer = customers.find(c => c.id === formData.target_customer_id)
          toast.success(`${t("admin", "createdForCustomer")} ${targetCustomer?.full_name}`)
        } else {
          toast.success(t("admin", "globalRewardCreated"))
        }
      }

      setIsDialogOpen(false)
      resetForm()
    } catch (error: any) {
      toast.error(error.message || t("admin", "operationFailed"))
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleActive = async (voucher: any) => {
    try {
      const { error } = await supabase
        .from("vouchers")
        .update({ is_active: !voucher.is_active })
        .eq("id", voucher.id)

      if (error) throw error

      setVouchers(prev => prev.map(v => 
        v.id === voucher.id ? { ...v, is_active: !v.is_active } : v
      ))
      toast.success(voucher.is_active ? t("admin", "voucherDisabled") : t("admin", "voucherEnabled"))
    } catch (error: any) {
      toast.error(error.message || t("admin", "operationFailed"))
    }
  }

  const handleDelete = async (voucher: any) => {
    if (!confirm(`${t("admin", "confirmDelete")} "${voucher.name}"?`)) return

    try {
      // Delete user_vouchers first
      await supabase.from("user_vouchers").delete().eq("voucher_id", voucher.id)
      
      const { error } = await supabase
        .from("vouchers")
        .delete()
        .eq("id", voucher.id)

      if (error) throw error

      setVouchers(prev => prev.filter(v => v.id !== voucher.id))
      toast.success(t("admin", "voucherDeleted"))
    } catch (error: any) {
      toast.error(error.message || t("admin", "deleteFailed"))
    }
  }

  // Render a voucher card
  const renderVoucherCard = (voucher: any, isPersonal: boolean) => (
    <Card
      key={voucher.id}
      className={`bg-card border hover:border-amber-500/50 transition-colors overflow-hidden ${
        !voucher.is_active ? "opacity-60" : ""
      }`}
    >
      {voucher.image_url && (
        <div className="relative w-full h-32 overflow-hidden bg-muted">
          <img src={voucher.image_url} alt={voucher.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        </div>
      )}
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              {isPersonal ? (
                <Badge variant="secondary" className="text-xs bg-purple-500/20 text-purple-500">
                  <User className="w-3 h-3 mr-1" />
                  {t("admin", "personalExclusive")}
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-xs bg-amber-500/20 text-amber-500">
                  <Users className="w-3 h-3 mr-1" />
                  {t("admin", "global")}
                </Badge>
              )}
              {voucher.created_by_ai && (
                <Badge variant="secondary" className="text-xs bg-blue-500/20 text-blue-500">
                  <Brain className="w-3 h-3 mr-1" />
                  AI
                </Badge>
              )}
              {!isPersonal && (
                <Badge variant="outline" className="text-xs">
                  <Repeat className="w-3 h-3 mr-1" />
                  {voucher.max_uses === null || voucher.max_uses === undefined 
                    ? t("admin", "unlimitedTimes") 
                    : `${voucher.max_uses}${t("admin", "timesPerPerson")}`}
                </Badge>
              )}
            </div>
            <CardTitle className="text-lg truncate text-foreground">{voucher.name}</CardTitle>
            {isPersonal && voucher.target_customer && (
              <p className="text-sm text-purple-500 mt-1 flex items-center gap-1">
                <User className="w-3 h-3" />
                {voucher.target_customer.full_name}
                {voucher.target_customer.phone && (
                  <span className="text-muted-foreground"> · {voucher.target_customer.phone}</span>
                )}
              </p>
            )}
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {voucher.description || t("admin", "noDescription")}
            </p>
            {voucher.ai_reason && (
              <p className="text-xs text-blue-500 mt-1">{t("admin", "aiReason")}: {voucher.ai_reason}</p>
            )}
          </div>
          <button
            onClick={() => handleToggleActive(voucher)}
            className={`ml-2 px-2 py-1 rounded text-xs shrink-0 transition-colors ${
              voucher.is_active
                ? "bg-green-500/20 text-green-500 hover:bg-green-500/30"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {voucher.is_active ? t("admin", "active") : t("admin", "inactive")}
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <span className="text-muted-foreground text-sm">
            {isPersonal ? t("admin", "pointsRequired") : t("admin", "redemptionPoints")}
          </span>
          <span className="font-bold text-amber-500">
            {voucher.points_required === 0 ? t("admin", "freeGift") : `${voucher.points_required} pts`}
          </span>
        </div>
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <span className="text-muted-foreground text-sm">{t("admin", "discountAmount")}</span>
          <span className="font-bold text-foreground">
            {voucher.discount_type === "percentage"
              ? `${voucher.discount_value}% OFF`
              : `RM ${voucher.discount_value} OFF`}
          </span>
        </div>
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <span className="text-muted-foreground text-sm">{t("admin", "voucherCode")}</span>
          <span className="font-mono text-sm text-foreground">{voucher.code}</span>
        </div>
        {voucher.valid_until && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <span className="text-muted-foreground text-sm">{t("admin", "validUntil")}</span>
            <span className="text-sm text-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(voucher.valid_until).toLocaleDateString("zh-CN")}
            </span>
          </div>
        )}
        <div className="flex gap-2 pt-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={() => openEditDialog(voucher)}
          >
            <Edit className="w-4 h-4 mr-1" />
            {t("common", "edit")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-red-500 hover:bg-red-500/10 hover:text-red-500"
            onClick={() => handleDelete(voucher)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
            <Gift className="w-6 h-6 sm:w-8 sm:h-8 text-amber-500" />
            {t("admin", "rewardsManagement")}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            {t("admin", "manageGlobalAndPersonal")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => openCreateDialog("global")} className="bg-amber-600 hover:bg-amber-700">
            <Plus className="w-4 h-4 mr-2" />
            {t("admin", "addGlobalReward")}
          </Button>
          <Button onClick={() => openCreateDialog("personal")} variant="outline" className="border-purple-500/50 text-purple-500 hover:bg-purple-500/10">
            <Plus className="w-4 h-4 mr-2" />
            {t("admin", "addPersonalVoucher")}
          </Button>
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Ticket className="w-5 h-5 text-amber-500" />
              {editingVoucher ? t("admin", "editVoucher") : formData.voucher_type === "personal" ? t("admin", "createPersonalVoucher") : t("admin", "createGlobalReward")}
            </DialogTitle>
            <DialogDescription>
              {formData.voucher_type === "personal" 
                ? t("admin", "personalVoucherDesc")
                : t("admin", "globalRewardDesc")
              }
            </DialogDescription>
          </DialogHeader>
          
          {/* Info Banner */}
          <div className={`flex items-start gap-2 p-3 rounded-lg border text-sm ${
            formData.voucher_type === "personal" 
              ? "bg-purple-500/10 border-purple-500/20" 
              : "bg-amber-500/10 border-amber-500/20"
          }`}>
            <Info className={`w-4 h-4 mt-0.5 shrink-0 ${
              formData.voucher_type === "personal" ? "text-purple-500" : "text-amber-500"
            }`} />
            <p className="text-muted-foreground">
              {formData.voucher_type === "personal"
                ? t("admin", "personalVoucherBanner")
                : t("admin", "globalRewardBanner")
              }
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            {/* Type Selector (only for new, not editing) */}
            {!editingVoucher && (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={formData.voucher_type === "global" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFormData(prev => ({ ...prev, voucher_type: "global", points_required: 100, target_customer_id: "" }))}
                  className={`flex-1 ${formData.voucher_type === "global" ? "bg-amber-600 hover:bg-amber-700" : ""}`}
                >
                  <Users className="w-4 h-4 mr-1" />
                  {t("admin", "addGlobalReward")}
                </Button>
                <Button
                  type="button"
                  variant={formData.voucher_type === "personal" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFormData(prev => ({ ...prev, voucher_type: "personal", points_required: 0 }))}
                  className={`flex-1 ${formData.voucher_type === "personal" ? "bg-purple-600 hover:bg-purple-700" : ""}`}
                >
                  <User className="w-4 h-4 mr-1" />
                  {t("admin", "personalExclusive")}
                </Button>
              </div>
            )}

            {/* Target Customer (only for personal) */}
            {formData.voucher_type === "personal" && !editingVoucher && (
              <div className="space-y-2">
                <Label className="text-foreground">{t("admin", "targetCustomer")} *</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder={t("admin", "searchCustomerNamePhone")}
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <ScrollArea className="h-[150px] border rounded-lg">
                  <div className="p-2 space-y-1">
                    {filteredCustomers.map(customer => (
                      <div
                        key={customer.id}
                        onClick={() => {
                          setFormData(prev => ({ ...prev, target_customer_id: customer.id }))
                          setCustomerSearch("")
                        }}
                        className={`p-2 rounded-lg cursor-pointer transition-colors flex items-center gap-2 ${
                          formData.target_customer_id === customer.id
                            ? "bg-purple-500/10 border border-purple-500/30"
                            : "hover:bg-muted/50"
                        }`}
                      >
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${
                          formData.target_customer_id === customer.id ? "bg-purple-500 text-white" : "bg-muted"
                        }`}>
                          <User className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <span className="text-sm font-medium">{customer.full_name || t("admin", "unknownCustomer")}</span>
                          <span className="text-xs text-muted-foreground ml-2">{customer.phone}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                {formData.target_customer_id && (
                  <p className="text-sm text-purple-500">
                    {t("admin", "selectedCustomer")}: {customers.find(c => c.id === formData.target_customer_id)?.full_name}
                  </p>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code" className="text-foreground">
                  {formData.voucher_type === "personal" ? t("admin", "codePrefix") : t("admin", "templateCode")}
                </Label>
                <Input
                  id="code"
                  placeholder={formData.voucher_type === "personal" ? "VIP" : "BURGER50"}
                  value={formData.code}
                  onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                  className="uppercase"
                  required={formData.voucher_type === "global"}
                />
                {formData.voucher_type === "personal" && (
                  <p className="text-xs text-muted-foreground">{t("admin", "autoAddSuffix")}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="points" className="text-foreground">{t("admin", "pointsRequired")}</Label>
                <Input
                  id="points"
                  type="number"
                  value={formData.points_required}
                  onChange={(e) => setFormData(prev => ({ ...prev, points_required: parseInt(e.target.value) || 0 }))}
                  required
                  min={0}
                />
                {formData.voucher_type === "personal" && (
                  <p className="text-xs text-muted-foreground">{t("admin", "freeGiftNote")}</p>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="name" className="text-foreground">{t("admin", "rewardName")}</Label>
              <Input
                id="name"
                placeholder={formData.voucher_type === "personal" ? t("admin", "namePlaceholderPersonal") : t("admin", "namePlaceholderGlobal")}
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-foreground">{t("admin", "description")}</Label>
              <Textarea
                id="description"
                placeholder={t("admin", "descriptionPlaceholder")}
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={2}
              />
            </div>

            {/* Voucher Image Upload */}
            <div className="space-y-2">
              <Label className="text-foreground flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                {t("ai", "voucherImageLabel")} <span className="text-xs text-muted-foreground font-normal">{t("ai", "voucherImageOptional")}</span>
              </Label>
              {(imagePreview || formData.image_url) ? (
                <div className="relative w-full h-36 rounded-xl overflow-hidden bg-muted border border-border">
                  <img 
                    src={imagePreview || formData.image_url} 
                    alt="Voucher preview" 
                    className="w-full h-full object-cover" 
                  />
                  <Button 
                    type="button" 
                    variant="destructive" 
                    size="icon" 
                    className="absolute top-2 right-2 h-7 w-7 rounded-full shadow-lg" 
                    onClick={() => { setFormData(prev => ({ ...prev, image_url: "" })); setImagePreview(null) }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                    <p className="text-xs text-white">{t("ai", "clickToRemove")}</p>
                  </div>
                </div>
              ) : (
                <div 
                  className="w-full h-36 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {isUploadingImage ? (
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  ) : (
                    <>
                      <Upload className="h-8 w-8 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">{t("ai", "clickToUploadVoucherImage")}</p>
                      <p className="text-xs text-muted-foreground">{t("ai", "pngJpgUpTo5mb")}</p>
                    </>
                  )}
                </div>
              )}
              <input 
                ref={fileInputRef} 
                type="file" 
                accept="image/*" 
                onChange={handleImageUpload} 
                className="hidden" 
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-foreground">{t("admin", "discountType")}</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={formData.discount_type === "percentage" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFormData(prev => ({ ...prev, discount_type: "percentage" }))}
                    className={`flex-1 ${formData.discount_type === "percentage" ? "bg-amber-600 hover:bg-amber-700" : ""}`}
                  >
                    {t("admin", "percentDiscount")}
                  </Button>
                  <Button
                    type="button"
                    variant={formData.discount_type === "fixed" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFormData(prev => ({ ...prev, discount_type: "fixed" }))}
                    className={`flex-1 ${formData.discount_type === "fixed" ? "bg-amber-600 hover:bg-amber-700" : ""}`}
                  >
                    {t("admin", "fixedDiscount")}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="discount_value" className="text-foreground">{t("admin", "discountValue")}</Label>
                <Input
                  id="discount_value"
                  type="number"
                  value={formData.discount_value}
                  onChange={(e) => setFormData(prev => ({ ...prev, discount_value: parseFloat(e.target.value) }))}
                  required
                  min={1}
                  step={formData.discount_type === "percentage" ? 1 : 0.1}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="valid_days" className="text-foreground">{t("admin", "validDaysLabel")}</Label>
                <Input
                  id="valid_days"
                  type="number"
                  value={formData.valid_days}
                  onChange={(e) => setFormData(prev => ({ ...prev, valid_days: parseInt(e.target.value) }))}
                  required
                  min={1}
                />
              </div>
              {formData.voucher_type === "global" && (
                <div className="space-y-2">
                  <Label className="text-foreground">{t("admin", "maxUsesPerCustomer")}</Label>
                  <Select
                    value={formData.max_uses_per_customer === null ? "unlimited" : String(formData.max_uses_per_customer)}
                    onValueChange={(value) => setFormData(prev => ({ 
                      ...prev, 
                      max_uses_per_customer: value === "unlimited" ? null : parseInt(value) 
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">{t("admin", "oneTime")}</SelectItem>
                      <SelectItem value="3">{t("admin", "threeTimes")}</SelectItem>
                      <SelectItem value="5">{t("admin", "fiveTimes")}</SelectItem>
                      <SelectItem value="unlimited">{t("admin", "unlimitedTimes")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                className="flex-1"
              >
                {t("common", "cancel")}
              </Button>
              <Button type="submit" disabled={isLoading} className={`flex-1 ${
                formData.voucher_type === "personal" ? "bg-purple-600 hover:bg-purple-700" : "bg-amber-600 hover:bg-amber-700"
              }`}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t("admin", "saving")}
                  </>
                ) : (
                  editingVoucher ? t("admin", "update") : t("common", "create")
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ==================== Global Rewards ==================== */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Badge variant="secondary" className="bg-amber-500/20 text-amber-500 px-3 py-1 text-sm">
            <Users className="w-4 h-4 mr-1" />
            {t("admin", "addGlobalReward")}
          </Badge>
          <span className="text-sm text-muted-foreground">{t("admin", "allCustomersRedeem")}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {globalVouchers.length > 0 ? (
            globalVouchers.map(v => renderVoucherCard(v, false))
          ) : (
            <Card className="col-span-full">
              <CardContent className="py-8 text-center">
                <Gift className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-50" />
                <p className="text-foreground font-medium">{t("admin", "noGlobalRewards")}</p>
                <Button className="mt-3 bg-amber-600 hover:bg-amber-700" size="sm" onClick={() => openCreateDialog("global")}>
                  <Plus className="w-4 h-4 mr-2" />
                  {t("admin", "addGlobalRewardBtn")}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* ==================== Personal Vouchers ==================== */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Badge variant="secondary" className="bg-purple-500/20 text-purple-500 px-3 py-1 text-sm">
            <User className="w-4 h-4 mr-1" />
            {t("admin", "personalVouchers")}
          </Badge>
          <span className="text-sm text-muted-foreground">{t("admin", "aiOrAdminCreated")}</span>
          <Badge variant="outline" className="text-xs">{personalVouchers.length} {t("admin", "count")}</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {personalVouchers.length > 0 ? (
            personalVouchers.map(v => renderVoucherCard(v, true))
          ) : (
            <Card className="col-span-full">
              <CardContent className="py-8 text-center">
                <User className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-50" />
                <p className="text-foreground font-medium">{t("admin", "noPersonalVouchers")}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {t("admin", "personalVoucherAutoOrManual")}
                </p>
                <Button className="mt-3" variant="outline" size="sm" onClick={() => openCreateDialog("personal")}>
                  <Plus className="w-4 h-4 mr-2" />
                  {t("admin", "createPersonalVoucherBtn")}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
