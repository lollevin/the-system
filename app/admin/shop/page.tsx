"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ArrowLeft,
  Search,
  Plus,
  Edit,
  Trash2,
  Key,
  Eye,
  EyeOff,
  Copy,
  Check,
  RefreshCw,
  Loader2,
  Upload,
  X,
  UtensilsCrossed,
  Users,
  UserMinus,
  UserX,
  AlertTriangle,
  Image as ImageIcon,
} from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import type { MenuItem, Profile } from "@/lib/supabase/types"
import { useLanguage } from "@/lib/i18n"

const CATEGORY_VALUES = ["brunch", "rice_bowl", "malaysian", "kids", "coffee", "drinks", "dessert", "high_tea", "other"]
const CATEGORY_KEY_MAP: Record<string, string> = {
  brunch: "catBrunch", rice_bowl: "catRiceBowl", malaysian: "catMalaysian", kids: "catKids",
  coffee: "catCoffee", drinks: "catDrinks", dessert: "catDessert", high_tea: "catHighTea", other: "catOther",
}

export default function ShopManagementPage() {
  const router = useRouter()
  const supabase = createClient()
  const { t } = useLanguage()
  const catLabel = (v: string) => t("admin", CATEGORY_KEY_MAP[v] || "catOther")

  // Active tab: menu or staff (vertical tabs on left)
  const [activeTab, setActiveTab] = useState<"menu" | "staff">("menu")
  const [shopName, setShopName] = useState("JP&Co")

  // Menu state
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [menuSearch, setMenuSearch] = useState("")
  const [menuCategory, setMenuCategory] = useState("all")
  const [menuLoading, setMenuLoading] = useState(true)
  const [menuDialogOpen, setMenuDialogOpen] = useState(false)
  const [editingMenuItem, setEditingMenuItem] = useState<MenuItem | null>(null)
  const [menuSaving, setMenuSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [menuForm, setMenuForm] = useState({ name: "", description: "", price: "", category: "brunch", image_url: "", is_active: true })

  // Staff state
  const [staffMembers, setStaffMembers] = useState<Profile[]>([])
  const [staffSearch, setStaffSearch] = useState("")
  const [staffLoading, setStaffLoading] = useState(true)
  const [staffDialogOpen, setStaffDialogOpen] = useState(false)
  const [editingStaff, setEditingStaff] = useState<Profile | null>(null)
  const [staffSaving, setStaffSaving] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [selectedStaff, setSelectedStaff] = useState<Set<string>>(new Set())
  const [createdCredentials, setCreatedCredentials] = useState<{email: string, password: string} | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingStaff, setDeletingStaff] = useState<Profile | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false)
  const [resetPasswordStaff, setResetPasswordStaff] = useState<Profile | null>(null)
  const [newPassword, setNewPassword] = useState("")
  const [isResetting, setIsResetting] = useState(false)
  const [resetSuccess, setResetSuccess] = useState(false)
  const [passwordCopied, setPasswordCopied] = useState(false)
  const [staffForm, setStaffForm] = useState({ full_name: "", email: "", phone: "", role: "staff" as "staff" | "admin", password: "" })

  // Batch add menu
  const [batchDialogOpen, setBatchDialogOpen] = useState(false)
  const [batchText, setBatchText] = useState("")
  const [batchFile, setBatchFile] = useState<File | null>(null)
  const [batchSaving, setBatchSaving] = useState(false)
  const batchFileRef = useRef<HTMLInputElement>(null)

  const handleBatchAdd = async () => {
    if (!batchText.trim() && !batchFile) {
      toast.error(t("admin", "shopBatchNeedInput"))
      return
    }
    setBatchSaving(true)
    try {
      let res: Response
      if (batchFile) {
        const fd = new FormData()
        if (batchText.trim()) fd.append("text", batchText.trim())
        fd.append("file", batchFile)
        res = await fetch("/api/admin/menu/batch-add", { method: "POST", body: fd })
      } else {
        res = await fetch("/api/admin/menu/batch-add", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: batchText.trim() }),
        })
      }
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data?.error || t("admin", "shopBatchFailed"))
        return
      }
      toast.success(
        t("admin", "shopBatchSuccess").replace("{count}", String(data.inserted_count || 0))
      )
      setBatchDialogOpen(false)
      setBatchText("")
      setBatchFile(null)
      if (batchFileRef.current) batchFileRef.current.value = ""
      await loadMenuItems()
    } catch (err: any) {
      toast.error(err?.message || t("admin", "shopBatchFailed"))
    } finally {
      setBatchSaving(false)
    }
  }

  useEffect(() => {
    loadMenuItems()
    loadStaffMembers()
    // Load shop name from settings
    fetch("/api/admin/shop-settings")
      .then(r => r.json())
      .then(d => { if (d?.shop_name) setShopName(d.shop_name) })
      .catch(() => {})
  }, [])

  const loadMenuItems = async () => {
    setMenuLoading(true)
    const { data } = await supabase.from("menu_items").select("*").order("category").order("name")
    setMenuItems(data || [])
    setMenuLoading(false)
  }

  const loadStaffMembers = async () => {
    setStaffLoading(true)
    const { data } = await supabase.from("profiles").select("*").in("role", ["staff", "admin"]).order("created_at", { ascending: false })
    setStaffMembers(data || [])
    setStaffLoading(false)
  }

  // Menu functions
  const filteredMenuItems = menuItems.filter(item => {
    const matchesSearch = !menuSearch || item.name.toLowerCase().includes(menuSearch.toLowerCase()) || item.description?.toLowerCase().includes(menuSearch.toLowerCase())
    const matchesCategory = menuCategory === "all" || item.category === menuCategory
    return matchesSearch && matchesCategory
  })

  const resetMenuForm = () => { setMenuForm({ name: "", description: "", price: "", category: "brunch", image_url: "", is_active: true }); setEditingMenuItem(null); setImagePreview(null) }

  const openMenuDialog = (item?: MenuItem) => {
    if (item) { setEditingMenuItem(item); setMenuForm({ name: item.name, description: item.description || "", price: item.price.toString(), category: item.category, image_url: item.image_url || "", is_active: item.is_active }); setImagePreview(item.image_url || null) }
    else { resetMenuForm() }
    setMenuDialogOpen(true)
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) { toast.error(t("admin", "shopInvalidImage")); return }
    setIsUploading(true)
    try {
      const reader = new FileReader(); reader.onload = (e) => setImagePreview(e.target?.result as string); reader.readAsDataURL(file)
      const filePath = `menu-images/menu_${Date.now()}_${Math.random().toString(36).substring(7)}.${file.name.split(".").pop()}`
      const { error } = await supabase.storage.from("uploads").upload(filePath, file, { cacheControl: "3600", upsert: false })
      if (error) throw error
      const { data: urlData } = supabase.storage.from("uploads").getPublicUrl(filePath)
      setMenuForm({ ...menuForm, image_url: urlData.publicUrl })
      toast.success(t("admin", "shopImageUploaded"))
    } catch (error: any) { toast.error(error.message || t("admin", "shopUploadFailed")); setImagePreview(null) }
    finally { setIsUploading(false) }
  }

  const saveMenuItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!menuForm.name.trim() || !menuForm.price) { toast.error("Please fill required fields"); return }
    setMenuSaving(true)
    try {
      const itemData = { name: menuForm.name.trim(), description: menuForm.description.trim() || null, price: parseFloat(menuForm.price), category: menuForm.category, image_url: menuForm.image_url.trim() || null, is_active: menuForm.is_active }
      if (editingMenuItem) {
        const { data, error } = await supabase.from("menu_items").update(itemData).eq("id", editingMenuItem.id).select().single()
        if (error) throw error
        setMenuItems(menuItems.map(item => item.id === editingMenuItem.id ? data : item))
        toast.success(t("admin", "shopItemUpdated"))
      } else {
        const { data, error } = await supabase.from("menu_items").insert(itemData).select().single()
        if (error) throw error
        setMenuItems([...menuItems, data])
        toast.success(t("admin", "shopItemAdded"))
      }
      setMenuDialogOpen(false); resetMenuForm()
    } catch (error: any) { toast.error(error.message || t("admin", "shopSaveFailed")) }
    finally { setMenuSaving(false) }
  }

  const deleteMenuItem = async (item: MenuItem) => {
    if (!confirm(`Delete "${item.name}"?`)) return
    const { error } = await supabase.from("menu_items").delete().eq("id", item.id)
    if (!error) { setMenuItems(menuItems.filter(i => i.id !== item.id)); toast.success("Deleted") }
    else { toast.error(t("admin", "shopDeleteFailed")) }
  }

  // Staff functions
  const filteredStaffMembers = staffMembers.filter(m => !staffSearch || m.full_name?.toLowerCase().includes(staffSearch.toLowerCase()) || m.email?.toLowerCase().includes(staffSearch.toLowerCase()))

  const generatePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789"
    let pwd = ""; for (let i = 0; i < 8; i++) pwd += chars.charAt(Math.floor(Math.random() * chars.length))
    return pwd + "Aa1!"
  }

  const resetStaffForm = () => { setStaffForm({ full_name: "", email: "", phone: "", role: "staff", password: generatePassword() }); setEditingStaff(null); setCreatedCredentials(null); setShowPassword(false) }

  const openStaffDialog = (member?: Profile) => {
    if (member) { setEditingStaff(member); setStaffForm({ full_name: member.full_name || "", email: member.email || "", phone: member.phone || "", role: member.role as "staff" | "admin", password: "" }) }
    else { resetStaffForm() }
    setStaffDialogOpen(true)
  }

  const saveStaff = async (e: React.FormEvent) => {
    e.preventDefault()
    setStaffSaving(true)
    try {
      if (editingStaff) {
        await supabase.from("profiles").update({ full_name: staffForm.full_name, phone: staffForm.phone, role: staffForm.role }).eq("id", editingStaff.id)
        setStaffMembers(staffMembers.map(s => s.id === editingStaff.id ? { ...s, full_name: staffForm.full_name, phone: staffForm.phone, role: staffForm.role } : s))
        toast.success(t("admin", "shopStaffUpdated")); setStaffDialogOpen(false); resetStaffForm()
      } else {
        const password = staffForm.password || generatePassword()
        const email = staffForm.email || `staff${Date.now()}@jpco-staff.com`
        const { data: authData, error: authError } = await supabase.auth.signUp({ email, password, options: { data: { full_name: staffForm.full_name, phone: staffForm.phone } } })
        if (authError) throw authError
        if (authData.user) {
          await supabase.from("profiles").update({ full_name: staffForm.full_name, phone: staffForm.phone, role: staffForm.role, notes: `pwd:${password}` }).eq("id", authData.user.id)
          const { data: newProfile } = await supabase.from("profiles").select("*").eq("id", authData.user.id).single()
          if (newProfile) setStaffMembers([newProfile, ...staffMembers])
          setCreatedCredentials({ email, password })
          toast.success("Staff created!")
        }
      }
    } catch (error: any) { toast.error(error.message || t("admin", "shopOperationFailed")) }
    finally { setStaffSaving(false) }
  }

  const toggleStaffSelection = (id: string) => { const s = new Set(selectedStaff); s.has(id) ? s.delete(id) : s.add(id); setSelectedStaff(s) }

  const deleteSelectedStaff = async () => {
    if (selectedStaff.size === 0 || !confirm(`Delete ${selectedStaff.size} staff?`)) return
    setIsDeleting(true)
    for (const id of selectedStaff) { await fetch("/api/admin/delete-user", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: id, deleteType: "hard" }) }) }
    setStaffMembers(staffMembers.filter(s => !selectedStaff.has(s.id))); setSelectedStaff(new Set()); toast.success("Deleted")
    setIsDeleting(false)
  }

  const handleDeleteStaff = async (deleteType: "soft" | "hard") => {
    if (!deletingStaff) return
    setIsDeleting(true)
    const res = await fetch("/api/admin/delete-user", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: deletingStaff.id, deleteType }) })
    const data = await res.json()
    if (res.ok) { setStaffMembers(staffMembers.filter(s => s.id !== deletingStaff.id)); toast.success(data.message); setDeleteDialogOpen(false); setDeletingStaff(null) }
    else { toast.error(data.error || t("admin", "shopDeleteFailed")) }
    setIsDeleting(false)
  }

  const handleResetPassword = async () => {
    if (!resetPasswordStaff || !newPassword) return
    setIsResetting(true)
    const res = await fetch("/api/admin/reset-staff-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: resetPasswordStaff.id, newPassword }) })
    if (res.ok) { setStaffMembers(staffMembers.map(s => s.id === resetPasswordStaff.id ? { ...s, notes: `pwd:${newPassword}` } : s)); setResetSuccess(true); toast.success(t("admin", "shopPasswordReset")) }
    else { toast.error(t("admin", "shopResetFailed")) }
    setIsResetting(false)
  }

  const copyToClipboard = async (text: string) => { await navigator.clipboard.writeText(text); setPasswordCopied(true); setTimeout(() => setPasswordCopied(false), 2000); toast.success("Copied!") }
  const getInitials = (name: string | null) => name ? name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "ST"

  return (
    <div className="fixed inset-0 bg-[#faf8f5] dark:bg-zinc-950 z-30 overflow-hidden flex flex-col">
      {/* Header - Back button + Title */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="h-14 bg-white dark:bg-zinc-900 border-b border-[#8b6f47]/10 flex items-center px-4 flex-shrink-0"
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/admin")}
          className="h-9 w-9 rounded-lg hover:bg-[#8b6f47]/10 mr-3"
        >
          <ArrowLeft className="h-5 w-5 text-[#8b6f47]" />
        </Button>
        <h1 className="text-lg font-bold text-[#3d3225] dark:text-white">{shopName} Management</h1>
      </motion.header>

      {/* Main Content - Left tabs + Right content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side - Vertical Tabs */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-24 sm:w-28 bg-white dark:bg-zinc-900 border-r border-[#8b6f47]/10 flex flex-col py-4 flex-shrink-0"
        >
          <button
            onClick={() => setActiveTab("menu")}
            className={`py-4 px-2 text-center transition-all relative ${
              activeTab === "menu" 
                ? "text-[#8b6f47] font-semibold bg-[#8b6f47]/5" 
                : "text-muted-foreground hover:text-[#8b6f47] hover:bg-[#8b6f47]/5"
            }`}
          >
            {activeTab === "menu" && (
              <motion.div
                layoutId="activeTab"
                className="absolute left-0 top-0 bottom-0 w-1 bg-[#8b6f47] rounded-r"
              />
            )}
            <UtensilsCrossed className="h-6 w-6 mx-auto mb-1" />
            <span className="text-sm">{t("admin", "shopMenu")}</span>
          </button>
          <button
            onClick={() => setActiveTab("staff")}
            className={`py-4 px-2 text-center transition-all relative ${
              activeTab === "staff" 
                ? "text-[#8b6f47] font-semibold bg-[#8b6f47]/5" 
                : "text-muted-foreground hover:text-[#8b6f47] hover:bg-[#8b6f47]/5"
            }`}
          >
            {activeTab === "staff" && (
              <motion.div
                layoutId="activeTab"
                className="absolute left-0 top-0 bottom-0 w-1 bg-[#8b6f47] rounded-r"
              />
            )}
            <Users className="h-6 w-6 mx-auto mb-1" />
            <span className="text-sm">{t("admin", "shopStaff")}</span>
          </button>
        </motion.div>

        {/* Right Side - Content */}
        <div className="flex-1 overflow-auto">
          <AnimatePresence mode="wait">
            {/* Menu Content */}
            {activeTab === "menu" && (
              <motion.div
                key="menu"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-4 sm:p-6"
              >
                {/* Menu Header */}
                <div className="flex flex-col sm:flex-row gap-4 justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-[#3d3225] dark:text-white">{t("admin", "shopMenu")}</h2>
                    <p className="text-sm text-muted-foreground">{menuItems.length} {t("admin", "shopItems")}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setBatchDialogOpen(true)}
                      variant="outline"
                      className="gap-2 border-[#8b6f47]/40 text-[#8b6f47] hover:bg-[#8b6f47]/10"
                    >
                      <Upload className="w-4 h-4" />{t("admin", "shopBatchAdd")}
                    </Button>
                    <Button onClick={() => openMenuDialog()} className="gap-2 bg-[#8b6f47] hover:bg-[#7a5f3d] text-white shadow-lg">
                      <Plus className="w-4 h-4" />{t("admin", "shopAddFoods")}
                    </Button>
                  </div>
                </div>

                {/* Search + Category Filter */}
                <div className="flex flex-col sm:flex-row gap-3 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      placeholder={t("admin", "shopSearchBar")} 
                      value={menuSearch} 
                      onChange={(e) => setMenuSearch(e.target.value)} 
                      className="pl-10 bg-white dark:bg-zinc-800 border-[#8b6f47]/20" 
                    />
                  </div>
                  <Select value={menuCategory} onValueChange={setMenuCategory}>
                    <SelectTrigger className="w-full sm:w-[180px] bg-white dark:bg-zinc-800 border-[#8b6f47]/20">
                      <SelectValue placeholder={t("admin", "shopCategoryToSelect")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("admin", "shopAllCategories")}</SelectItem>
                      {CATEGORY_VALUES.map(v => <SelectItem key={v} value={v}>{catLabel(v)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Menu Items List */}
                {menuLoading ? (
                  <div className="flex items-center justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-[#8b6f47]" /></div>
                ) : filteredMenuItems.length === 0 ? (
                  <div className="text-center py-20"><UtensilsCrossed className="w-16 h-16 mx-auto mb-4 text-[#8b6f47]/30" /><p className="text-muted-foreground">{t("admin", "shopNoMenuItems")}</p></div>
                ) : (
                  <div className="space-y-3">
                    {filteredMenuItems.map((item, i) => (
                      <motion.div 
                        key={item.id} 
                        initial={{ opacity: 0, y: 10 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        transition={{ delay: i * 0.02 }}
                      >
                        <Card className={`bg-white dark:bg-zinc-800 border-[#8b6f47]/10 hover:border-[#8b6f47]/30 transition-all ${!item.is_active ? "opacity-50" : ""}`}>
                          <CardContent className="p-3 sm:p-4 flex items-center gap-3 sm:gap-4">
                            {/* Food Image */}
                            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-[#f5f0e8] flex-shrink-0 border border-[#8b6f47]/10">
                              {item.image_url ? (
                                <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-6 h-6 text-[#8b6f47]/30" /></div>
                              )}
                            </div>
                            
                            {/* Food Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="outline" className="text-[10px] bg-[#8b6f47]/10 text-[#8b6f47] border-[#8b6f47]/20">
                                  {catLabel(item.category)}
                                </Badge>
                                {!item.is_active && <Badge variant="outline" className="text-[10px]">{t("admin", "shopHidden")}</Badge>}
                              </div>
                              <h4 className="font-semibold text-[#3d3225] dark:text-white mt-1">{item.name}</h4>
                              {item.description && <p className="text-xs text-muted-foreground line-clamp-1">{item.description}</p>}
                              <p className="text-sm font-bold text-[#8b6f47] mt-1">RM {item.price.toFixed(2)}</p>
                            </div>
                            
                            {/* Action Buttons - Edit & Delete stacked */}
                            <div className="flex flex-col gap-1">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => openMenuDialog(item)} 
                                className="h-8 text-xs border-[#8b6f47]/20 hover:bg-[#8b6f47]/10 hover:text-[#8b6f47]"
                              >
                                <Edit className="h-3 w-3 mr-1" />{t("admin", "shopEdit")}
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => deleteMenuItem(item)} 
                                className="h-8 text-xs border-red-500/20 hover:bg-red-500/10 hover:text-red-500 text-red-500"
                              >
                                <Trash2 className="h-3 w-3 mr-1" />{t("admin", "shopDelete")}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* Staff Content */}
            {activeTab === "staff" && (
              <motion.div
                key="staff"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-4 sm:p-6"
              >
                {/* Staff Header */}
                <div className="flex flex-col sm:flex-row gap-4 justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-[#3d3225] dark:text-white">{t("admin", "shopStaff")}</h2>
                    <p className="text-sm text-muted-foreground">{staffMembers.length} {t("admin", "shopMembers")}</p>
                  </div>
                  <div className="flex gap-2">
                    {selectedStaff.size > 0 && (
                      <Button variant="destructive" onClick={deleteSelectedStaff} disabled={isDeleting} size="sm">
                        <Trash2 className="w-4 h-4 mr-1" />{t("admin", "shopDelete")} ({selectedStaff.size})
                      </Button>
                    )}
                    <Button onClick={() => openStaffDialog()} className="gap-2 bg-[#8b6f47] hover:bg-[#7a5f3d] text-white shadow-lg">
                      <Plus className="w-4 h-4" />{t("admin", "shopAddStaff")}
                    </Button>
                  </div>
                </div>

                {/* Search Bar */}
                <div className="mb-6">
                  <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      placeholder={t("admin", "shopSearchBar")} 
                      value={staffSearch} 
                      onChange={(e) => setStaffSearch(e.target.value)} 
                      className="pl-10 bg-white dark:bg-zinc-800 border-[#8b6f47]/20" 
                    />
                  </div>
                </div>

                {/* Staff Grid - Card layout like PDF */}
                {staffLoading ? (
                  <div className="flex items-center justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-[#8b6f47]" /></div>
                ) : filteredStaffMembers.length === 0 ? (
                  <div className="text-center py-20"><Users className="w-16 h-16 mx-auto mb-4 text-[#8b6f47]/30" /><p className="text-muted-foreground">{t("admin", "shopNoStaff")}</p></div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredStaffMembers.map((member, i) => (
                      <motion.div 
                        key={member.id} 
                        initial={{ opacity: 0, y: 10 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        transition={{ delay: i * 0.03 }}
                      >
                        <Card className="bg-white dark:bg-zinc-800 border-[#8b6f47]/10 hover:border-[#8b6f47]/30 transition-all overflow-hidden">
                          <CardContent className="p-4">
                            {/* Top row - Checkbox + Edit button */}
                            <div className="flex items-center justify-between mb-3">
                              <Checkbox 
                                checked={selectedStaff.has(member.id)} 
                                onCheckedChange={() => toggleStaffSelection(member.id)} 
                                className="data-[state=checked]:bg-[#8b6f47] data-[state=checked]:border-[#8b6f47]" 
                              />
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => openStaffDialog(member)} 
                                className="h-8 w-8 hover:bg-[#8b6f47]/10"
                              >
                                <Edit className="h-4 w-4 text-[#8b6f47]" />
                              </Button>
                            </div>
                            
                            {/* Staff Info */}
                            <div className="text-center">
                              <Avatar className="h-16 w-16 mx-auto border-2 border-[#8b6f47]/20">
                                <AvatarFallback className="bg-[#8b6f47]/10 text-[#8b6f47] font-semibold text-lg">
                                  {getInitials(member.full_name)}
                                </AvatarFallback>
                              </Avatar>
                              <h4 className="font-semibold text-[#3d3225] dark:text-white mt-3">{member.full_name || t("admin", "shopUnnamed")}</h4>
                              <Badge variant="secondary" className={`mt-1 ${member.role === "admin" ? "bg-[#8b6f47]/20 text-[#8b6f47]" : ""}`}>
                                {member.role}
                              </Badge>
                              <p className="text-xs text-muted-foreground mt-2 truncate">{member.email}</p>
                            </div>

                            {/* Action buttons at bottom */}
                            <div className="flex justify-center gap-2 mt-4 pt-3 border-t border-[#8b6f47]/10">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => { setResetPasswordStaff(member); setNewPassword(generatePassword()); setResetSuccess(false); setResetPasswordDialogOpen(true) }} 
                                className="h-8 w-8 hover:bg-amber-500/10" 
                                title={t("admin", "shopResetPassword")}
                              >
                                <Key className="h-4 w-4 text-amber-500" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => { setDeletingStaff(member); setDeleteDialogOpen(true) }} 
                                className="h-8 w-8 hover:bg-red-500/10" 
                                title={t("admin", "shopDelete")}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Batch Add Menu Dialog */}
      <Dialog open={batchDialogOpen} onOpenChange={(o) => { setBatchDialogOpen(o); if (!o) { setBatchText(""); setBatchFile(null) } }}>
        <DialogContent className="max-w-lg bg-white dark:bg-zinc-900">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-[#8b6f47]" />
              {t("admin", "shopBatchAdd")}
            </DialogTitle>
            <DialogDescription>{t("admin", "shopBatchDesc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t("admin", "shopBatchTextLabel")}</Label>
              <Textarea
                value={batchText}
                onChange={(e) => setBatchText(e.target.value)}
                rows={5}
                placeholder={t("admin", "shopBatchTextPlaceholder")}
                className="font-mono text-sm mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">{t("admin", "shopBatchTextHint")}</p>
            </div>

            <div className="relative flex items-center">
              <div className="flex-1 border-t border-border/50"></div>
              <span className="px-3 text-xs text-muted-foreground uppercase">{t("admin", "shopOr")}</span>
              <div className="flex-1 border-t border-border/50"></div>
            </div>

            <div>
              <Label>{t("admin", "shopBatchFileLabel")}</Label>
              <div className="mt-2">
                {batchFile ? (
                  <div className="flex items-center justify-between gap-2 p-3 rounded-lg border border-[#8b6f47]/30 bg-[#8b6f47]/5">
                    <div className="flex items-center gap-2 min-w-0">
                      <ImageIcon className="w-5 h-5 text-[#8b6f47] shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{batchFile.name}</p>
                        <p className="text-xs text-muted-foreground">{(batchFile.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                    <Button type="button" variant="ghost" size="icon" onClick={() => { setBatchFile(null); if (batchFileRef.current) batchFileRef.current.value = "" }}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => batchFileRef.current?.click()}
                    className="w-full p-4 rounded-lg border-2 border-dashed border-[#8b6f47]/30 hover:border-[#8b6f47] hover:bg-[#8b6f47]/5 transition-colors flex flex-col items-center gap-2"
                  >
                    <Upload className="w-6 h-6 text-[#8b6f47]/60" />
                    <span className="text-sm font-medium">{t("admin", "shopBatchFileBtn")}</span>
                    <span className="text-xs text-muted-foreground">{t("admin", "shopBatchFileHint")}</span>
                  </button>
                )}
                <input
                  ref={batchFileRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp,.xlsx,.xls,.csv,.txt,.docx"
                  onChange={(e) => setBatchFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </div>
            </div>

            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/40">
              <div className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs">✨</span>
              </div>
              <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
                {t("admin", "shopBatchAiHint")}
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setBatchDialogOpen(false)} disabled={batchSaving} className="flex-1">
                {t("admin", "shopCancel")}
              </Button>
              <Button type="button" onClick={handleBatchAdd} disabled={batchSaving} className="flex-1 bg-[#8b6f47] hover:bg-[#7a5f3d] text-white">
                {batchSaving ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" />{t("admin", "shopBatchProcessing")}</>
                ) : (
                  <><Plus className="w-4 h-4 mr-2" />{t("admin", "shopBatchCreate")}</>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Menu Dialog */}
      <Dialog open={menuDialogOpen} onOpenChange={setMenuDialogOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-zinc-900">
          <DialogHeader><DialogTitle>{editingMenuItem ? t("admin", "shopEditItem") : t("admin", "shopAddMenuItem")}</DialogTitle></DialogHeader>
          <form onSubmit={saveMenuItem} className="space-y-4">
            <div><Label>{t("admin", "shopItemName")} *</Label><Input value={menuForm.name} onChange={(e) => setMenuForm({ ...menuForm, name: e.target.value })} placeholder="e.g. Classic Burger" required /></div>
            <div><Label>{t("admin", "shopCategory")} *</Label><Select value={menuForm.category} onValueChange={(v) => setMenuForm({ ...menuForm, category: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CATEGORY_VALUES.map(v => <SelectItem key={v} value={v}>{catLabel(v)}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>{t("admin", "shopPrice")} (RM) *</Label><Input type="number" step="0.01" min="0" value={menuForm.price} onChange={(e) => setMenuForm({ ...menuForm, price: e.target.value })} required /></div>
            <div><Label>{t("admin", "shopDescription")}</Label><Textarea value={menuForm.description} onChange={(e) => setMenuForm({ ...menuForm, description: e.target.value })} rows={2} /></div>
            <div>
              <Label>{t("admin", "shopFoodImage")}</Label>
              <div className="mt-2">
                {(imagePreview || menuForm.image_url) ? (
                  <div className="relative w-full h-32 rounded-xl overflow-hidden bg-muted mb-2"><img src={imagePreview || menuForm.image_url} alt="Preview" className="w-full h-full object-cover" /><Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2 h-7 w-7" onClick={() => { setMenuForm({ ...menuForm, image_url: "" }); setImagePreview(null) }}><X className="h-4 w-4" /></Button></div>
                ) : (<div className="w-full h-32 rounded-xl border-2 border-dashed border-[#8b6f47]/30 flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-[#8b6f47] hover:bg-[#8b6f47]/5 transition-colors" onClick={() => fileInputRef.current?.click()}>{isUploading ? <Loader2 className="h-6 w-6 animate-spin text-[#8b6f47]" /> : <><Upload className="h-6 w-6 text-[#8b6f47]/50" /><span className="text-xs text-muted-foreground">{t("admin", "shopClickToUpload")}</span></>}</div>)}
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </div>
            </div>
            <div className="flex items-center justify-between"><div><Label>{t("admin", "shopShowOnMenu")}</Label><p className="text-xs text-muted-foreground">{t("admin", "shopToggleVisibility")}</p></div><Switch checked={menuForm.is_active} onCheckedChange={(c) => setMenuForm({ ...menuForm, is_active: c })} /></div>
            <div className="flex gap-2 pt-2"><Button type="button" variant="outline" onClick={() => setMenuDialogOpen(false)} className="flex-1">{t("admin", "shopCancel")}</Button><Button type="submit" disabled={menuSaving} className="flex-1 bg-[#8b6f47] hover:bg-[#7a5f3d] text-white">{menuSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingMenuItem ? t("admin", "shopUpdate") : t("admin", "shopAdd")}</Button></div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Staff Dialog */}
      <Dialog open={staffDialogOpen} onOpenChange={(o) => { setStaffDialogOpen(o); if (!o) resetStaffForm() }}>
        <DialogContent className="max-w-md bg-white dark:bg-zinc-900">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Users className="w-5 h-5 text-[#8b6f47]" />{editingStaff ? t("admin", "shopEditStaff") : createdCredentials ? t("admin", "shopAccountCreated") : t("admin", "shopAddNewStaff")}</DialogTitle>{!editingStaff && !createdCredentials && <DialogDescription>{t("admin", "shopCreateStaffDesc")}</DialogDescription>}</DialogHeader>
          {createdCredentials ? (
            <div className="space-y-4 mt-4">
              <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                <p className="text-sm text-green-600 font-medium mb-3">{t("admin", "shopStaffCreatedMsg")}</p>
                <div className="space-y-3">
                  <div><Label className="text-xs text-muted-foreground">{t("admin", "shopEmail")}</Label><div className="flex gap-2"><Input value={createdCredentials.email} readOnly className="font-mono text-sm" /><Button variant="outline" size="icon" onClick={() => copyToClipboard(createdCredentials.email)}><Copy className="h-4 w-4" /></Button></div></div>
                  <div><Label className="text-xs text-muted-foreground">{t("admin", "shopPassword")}</Label><div className="flex gap-2"><Input type={showPassword ? "text" : "password"} value={createdCredentials.password} readOnly className="font-mono text-sm" /><Button variant="outline" size="icon" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button><Button variant="outline" size="icon" onClick={() => copyToClipboard(createdCredentials.password)}>{passwordCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}</Button></div></div>
                </div>
              </div>
              <Button variant="outline" className="w-full" onClick={() => copyToClipboard(`${t("admin", "shopEmail")}: ${createdCredentials.email}\n${t("admin", "shopPassword")}: ${createdCredentials.password}`)}><Copy className="h-4 w-4 mr-2" />{t("admin", "shopCopyAll")}</Button>
              <Button onClick={() => { setStaffDialogOpen(false); resetStaffForm() }} className="w-full bg-[#8b6f47] hover:bg-[#7a5f3d] text-white">{t("admin", "shopDone")}</Button>
            </div>
          ) : (
            <form onSubmit={saveStaff} className="space-y-4 mt-2">
              <div><Label>{t("admin", "shopFullName")}</Label><Input value={staffForm.full_name} onChange={(e) => setStaffForm({ ...staffForm, full_name: e.target.value })} placeholder="John Doe" required /></div>
              {!editingStaff && (<><div><Label>{t("admin", "shopEmail")}</Label><Input type="email" value={staffForm.email} onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })} placeholder="staff@jpco.com" required /></div><div><Label>{t("admin", "shopPassword")}</Label><div className="flex gap-2"><div className="relative flex-1"><Input type={showPassword ? "text" : "password"} value={staffForm.password} onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })} className="pr-10" required minLength={6} /><Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-3 hover:bg-transparent" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button></div><Button type="button" variant="outline" size="icon" onClick={() => setStaffForm({ ...staffForm, password: generatePassword() })}><RefreshCw className="h-4 w-4" /></Button></div></div></>)}
              {editingStaff && (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <div className="flex items-center gap-2 text-amber-600 text-sm">
                    <Key className="h-4 w-4" />
                    <span>{t("admin", "shopResetHint")}</span>
                  </div>
                </div>
              )}
              <div><Label>{t("admin", "shopPhone")}</Label><Input type="tel" value={staffForm.phone} onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })} placeholder="+60 12 345 6789" /></div>
              <div><Label>{t("admin", "shopRole")}</Label><Select value={staffForm.role} onValueChange={(v: "staff" | "admin") => setStaffForm({ ...staffForm, role: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="staff">{t("admin", "shopRoleStaff")}</SelectItem><SelectItem value="admin">{t("admin", "shopRoleAdmin")}</SelectItem></SelectContent></Select></div>
              <div className="flex gap-2 pt-2"><Button type="button" variant="outline" onClick={() => setStaffDialogOpen(false)} className="flex-1">{t("admin", "shopCancel")}</Button><Button type="submit" disabled={staffSaving} className="flex-1 bg-[#8b6f47] hover:bg-[#7a5f3d] text-white">{staffSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingStaff ? t("admin", "shopUpdate") : t("admin", "shopCreate")}</Button></div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Staff Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={(o) => { setDeleteDialogOpen(o); if (!o) setDeletingStaff(null) }}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-zinc-900">
          <DialogHeader><DialogTitle className="flex items-center gap-2 text-red-500"><AlertTriangle className="w-5 h-5" />{t("admin", "shopDeleteStaff")}</DialogTitle><DialogDescription>{t("admin", "shopChooseHandle")} <span className="font-semibold">{deletingStaff?.full_name}</span></DialogDescription></DialogHeader>
          <div className="space-y-3 mt-4">
            <button onClick={() => handleDeleteStaff("soft")} disabled={isDeleting} className="w-full p-4 rounded-xl border hover:border-amber-500 hover:bg-amber-500/5 transition-colors text-left"><div className="flex gap-3"><div className="p-2 rounded-full bg-amber-500/20"><UserMinus className="w-5 h-5 text-amber-500" /></div><div><h4 className="font-semibold">{t("admin", "shopDemoteCustomer")}</h4><p className="text-sm text-muted-foreground">{t("admin", "shopRemovePerms")}</p></div></div></button>
            <button onClick={() => handleDeleteStaff("hard")} disabled={isDeleting} className="w-full p-4 rounded-xl border border-red-500/30 hover:border-red-500 hover:bg-red-500/5 transition-colors text-left"><div className="flex gap-3"><div className="p-2 rounded-full bg-red-500/20"><UserX className="w-5 h-5 text-red-500" /></div><div><h4 className="font-semibold text-red-500">{t("admin", "shopDeleteCompletely")}</h4><p className="text-sm text-muted-foreground">{t("admin", "shopPermDelete")}</p></div></div></button>
          </div>
          {isDeleting && <div className="flex items-center justify-center py-4"><Loader2 className="w-6 h-6 animate-spin" /><span className="ml-2 text-muted-foreground">{t("admin", "shopProcessing")}</span></div>}
          <div className="flex justify-end mt-4"><Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={isDeleting}>{t("admin", "shopCancel")}</Button></div>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetPasswordDialogOpen} onOpenChange={(o) => { setResetPasswordDialogOpen(o); if (!o) { setResetPasswordStaff(null); setResetSuccess(false) } }}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-zinc-900">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Key className="w-5 h-5 text-amber-500" />{t("admin", "shopResetPassword")}</DialogTitle><DialogDescription>{t("admin", "shopSetNewFor")} <span className="font-semibold">{resetPasswordStaff?.full_name}</span></DialogDescription></DialogHeader>
          {resetSuccess ? (
            <div className="space-y-4 mt-4">
              <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                <p className="text-sm text-green-600 font-medium mb-3">{t("admin", "shopPasswordResetMsg")}</p>
                <div className="space-y-3">
                  <div><Label className="text-xs text-muted-foreground">{t("admin", "shopEmail")}</Label><div className="flex gap-2"><Input value={resetPasswordStaff?.email || ""} readOnly className="font-mono text-sm" /><Button variant="outline" size="icon" onClick={() => copyToClipboard(resetPasswordStaff?.email || "")}><Copy className="h-4 w-4" /></Button></div></div>
                  <div><Label className="text-xs text-muted-foreground">{t("admin", "shopNewPassword")}</Label><div className="flex gap-2"><Input type={showPassword ? "text" : "password"} value={newPassword} readOnly className="font-mono text-sm" /><Button variant="outline" size="icon" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button><Button variant="outline" size="icon" onClick={() => copyToClipboard(newPassword)}>{passwordCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}</Button></div></div>
                </div>
              </div>
              <Button variant="outline" className="w-full" onClick={() => copyToClipboard(`${t("admin", "shopEmail")}: ${resetPasswordStaff?.email}\n${t("admin", "shopNewPassword")}: ${newPassword}`)}><Copy className="h-4 w-4 mr-2" />{t("admin", "shopCopyAll")}</Button>
              <Button onClick={() => { setResetPasswordDialogOpen(false); setResetSuccess(false) }} className="w-full bg-[#8b6f47] hover:bg-[#7a5f3d] text-white">{t("admin", "shopDone")}</Button>
            </div>
          ) : (
            <div className="space-y-4 mt-4">
              <div><Label>{t("admin", "shopNewPassword")}</Label><div className="flex gap-2"><div className="relative flex-1"><Input type={showPassword ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="pr-10" minLength={6} /><Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-3 hover:bg-transparent" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button></div><Button variant="outline" size="icon" onClick={() => setNewPassword(generatePassword())}><RefreshCw className="h-4 w-4" /></Button></div><p className="text-xs text-muted-foreground">{t("admin", "shopAtLeast6")}</p></div>
              <div className="flex gap-2 pt-2"><Button variant="outline" onClick={() => setResetPasswordDialogOpen(false)} className="flex-1" disabled={isResetting}>{t("admin", "shopCancel")}</Button><Button onClick={handleResetPassword} disabled={isResetting || newPassword.length < 6} className="flex-1 bg-[#8b6f47] hover:bg-[#7a5f3d] text-white">{isResetting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}{isResetting ? t("admin", "shopResetting") : t("admin", "shopReset")}</Button></div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
