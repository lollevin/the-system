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
  Store,
  UserMinus,
  UserX,
  AlertTriangle,
  Image as ImageIcon,
  Settings,
  LogOut,
} from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import type { MenuItem, Profile } from "@/lib/supabase/types"
import Image from "next/image"

const CATEGORY_VALUES = ["brunch", "rice_bowl", "malaysian", "kids", "coffee", "drinks", "dessert", "high_tea", "other"]
const CATEGORY_LABELS: Record<string, string> = {
  brunch: "Brunch", rice_bowl: "Rice Bowls", malaysian: "Malaysian", kids: "Kids Menu",
  coffee: "Coffee", drinks: "Drinks", dessert: "Desserts", high_tea: "High Tea", other: "Other",
}

export default function ShopManagementPage() {
  const router = useRouter()
  const supabase = createClient()

  // View: "select" shows Menu/Staff buttons, "menu" shows menu list, "staff" shows staff list
  const [activeView, setActiveView] = useState<"select" | "menu" | "staff">("select")

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

  useEffect(() => { loadMenuItems(); loadStaffMembers() }, [])

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

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
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
    if (!file || !file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) { toast.error("Invalid image"); return }
    setIsUploading(true)
    try {
      const reader = new FileReader(); reader.onload = (e) => setImagePreview(e.target?.result as string); reader.readAsDataURL(file)
      const filePath = `menu-images/menu_${Date.now()}_${Math.random().toString(36).substring(7)}.${file.name.split(".").pop()}`
      const { error } = await supabase.storage.from("uploads").upload(filePath, file, { cacheControl: "3600", upsert: false })
      if (error) throw error
      const { data: urlData } = supabase.storage.from("uploads").getPublicUrl(filePath)
      setMenuForm({ ...menuForm, image_url: urlData.publicUrl })
      toast.success("Image uploaded")
    } catch (error: any) { toast.error(error.message || "Upload failed"); setImagePreview(null) }
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
        toast.success("Item updated")
      } else {
        const { data, error } = await supabase.from("menu_items").insert(itemData).select().single()
        if (error) throw error
        setMenuItems([...menuItems, data])
        toast.success("Item added")
      }
      setMenuDialogOpen(false); resetMenuForm()
    } catch (error: any) { toast.error(error.message || "Save failed") }
    finally { setMenuSaving(false) }
  }

  const deleteMenuItem = async (item: MenuItem) => {
    if (!confirm(`Delete "${item.name}"?`)) return
    const { error } = await supabase.from("menu_items").delete().eq("id", item.id)
    if (!error) { setMenuItems(menuItems.filter(i => i.id !== item.id)); toast.success("Deleted") }
    else { toast.error("Delete failed") }
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
        toast.success("Staff updated"); setStaffDialogOpen(false); resetStaffForm()
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
    } catch (error: any) { toast.error(error.message || "Operation failed") }
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
    else { toast.error(data.error || "Delete failed") }
    setIsDeleting(false)
  }

  const handleResetPassword = async () => {
    if (!resetPasswordStaff || !newPassword) return
    setIsResetting(true)
    const res = await fetch("/api/admin/reset-staff-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: resetPasswordStaff.id, newPassword }) })
    if (res.ok) { setStaffMembers(staffMembers.map(s => s.id === resetPasswordStaff.id ? { ...s, notes: `pwd:${newPassword}` } : s)); setResetSuccess(true); toast.success("Password reset") }
    else { toast.error("Reset failed") }
    setIsResetting(false)
  }

  const copyToClipboard = async (text: string) => { await navigator.clipboard.writeText(text); setPasswordCopied(true); setTimeout(() => setPasswordCopied(false), 2000); toast.success("Copied!") }
  const getInitials = (name: string | null) => name ? name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "ST"

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-[#faf8f5] to-[#f5f0e8] dark:from-zinc-900 dark:to-zinc-950 z-[9999] overflow-auto">
      {/* Top Bar - Clean design like PDF */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-50 h-16 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-b border-[#8b6f47]/10 flex items-center justify-between px-6"
      >
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => activeView === "select" ? router.push("/admin") : setActiveView("select")}
            className="h-10 w-10 rounded-xl hover:bg-[#8b6f47]/10"
          >
            <ArrowLeft className="h-5 w-5 text-[#8b6f47]" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#8b6f47] to-[#a08060] flex items-center justify-center shadow-lg">
              <Store className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-[#3d3225]">Shop Management</h1>
              <p className="text-xs text-[#8b6f47]/70">
                {activeView === "select" ? "Choose a section" : activeView === "menu" ? "Menu Items" : "Staff Members"}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => router.push("/admin/settings")} className="h-10 w-10 rounded-xl hover:bg-[#8b6f47]/10">
            <Settings className="h-5 w-5 text-[#8b6f47]" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleLogout} className="h-10 w-10 rounded-xl hover:bg-red-500/10">
            <LogOut className="h-5 w-5 text-red-500" />
          </Button>
        </div>
      </motion.header>

      {/* Content */}
      <div className="p-6 max-w-5xl mx-auto">
        <AnimatePresence mode="wait">
          {/* Selection View - Two big buttons */}
          {activeView === "select" && (
            <motion.div key="select" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.3 }} className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
              <motion.button whileHover={{ scale: 1.02, y: -4 }} whileTap={{ scale: 0.98 }} onClick={() => setActiveView("menu")}
                className="group relative p-8 rounded-3xl bg-white dark:bg-zinc-800 border-2 border-[#8b6f47]/20 hover:border-[#8b6f47] shadow-xl hover:shadow-2xl transition-all duration-300 text-left overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-[#8b6f47]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
                  <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform">
                    <UtensilsCrossed className="h-10 w-10 text-white" />
                  </div>
                  <h2 className="text-3xl font-bold text-[#3d3225] dark:text-white mb-2">Menu</h2>
                  <p className="text-[#8b6f47]/70 text-lg">{menuItems.length} items</p>
                  <p className="text-sm text-muted-foreground mt-2">Manage food items, prices, and categories</p>
                </div>
              </motion.button>

              <motion.button whileHover={{ scale: 1.02, y: -4 }} whileTap={{ scale: 0.98 }} onClick={() => setActiveView("staff")}
                className="group relative p-8 rounded-3xl bg-white dark:bg-zinc-800 border-2 border-[#8b6f47]/20 hover:border-[#8b6f47] shadow-xl hover:shadow-2xl transition-all duration-300 text-left overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-[#8b6f47]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
                  <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-[#8b6f47] to-[#6b5535] flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform">
                    <Users className="h-10 w-10 text-white" />
                  </div>
                  <h2 className="text-3xl font-bold text-[#3d3225] dark:text-white mb-2">Staff</h2>
                  <p className="text-[#8b6f47]/70 text-lg">{staffMembers.length} members</p>
                  <p className="text-sm text-muted-foreground mt-2">Manage team members and permissions</p>
                </div>
              </motion.button>
            </motion.div>
          )}

          {/* Menu View */}
          {activeView === "menu" && (
            <motion.div key="menu" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="space-y-6">
              <div className="flex flex-col sm:flex-row gap-4 justify-between">
                <div className="flex gap-2 flex-1">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="Search menu..." value={menuSearch} onChange={(e) => setMenuSearch(e.target.value)} className="pl-10 bg-white dark:bg-zinc-800 border-[#8b6f47]/20" />
                  </div>
                  <Select value={menuCategory} onValueChange={setMenuCategory}>
                    <SelectTrigger className="w-[150px] bg-white dark:bg-zinc-800 border-[#8b6f47]/20"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {CATEGORY_VALUES.map(v => <SelectItem key={v} value={v}>{CATEGORY_LABELS[v]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={() => openMenuDialog()} className="gap-2 bg-[#8b6f47] hover:bg-[#7a5f3d] text-white shadow-lg"><Plus className="w-4 h-4" />Add Food</Button>
              </div>

              {menuLoading ? (
                <div className="flex items-center justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-[#8b6f47]" /></div>
              ) : filteredMenuItems.length === 0 ? (
                <div className="text-center py-20"><UtensilsCrossed className="w-16 h-16 mx-auto mb-4 text-[#8b6f47]/30" /><p className="text-muted-foreground">No menu items found</p></div>
              ) : (
                <div className="space-y-3">
                  {filteredMenuItems.map((item, i) => (
                    <motion.div key={item.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                      <Card className={`bg-white dark:bg-zinc-800 border-[#8b6f47]/10 hover:border-[#8b6f47]/30 transition-all ${!item.is_active ? "opacity-50" : ""}`}>
                        <CardContent className="p-4 flex items-center gap-4">
                          <div className="w-16 h-16 rounded-xl overflow-hidden bg-[#f5f0e8] flex-shrink-0">
                            {item.image_url ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-6 h-6 text-[#8b6f47]/30" /></div>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-semibold text-[#3d3225] dark:text-white">{item.name}</h4>
                              <Badge variant="secondary" className="text-[10px] bg-[#8b6f47]/10 text-[#8b6f47]">{CATEGORY_LABELS[item.category]}</Badge>
                              {!item.is_active && <Badge variant="outline" className="text-[10px]">Hidden</Badge>}
                            </div>
                            {item.description && <p className="text-sm text-muted-foreground line-clamp-1">{item.description}</p>}
                          </div>
                          <span className="font-bold text-[#8b6f47] text-lg">RM {item.price.toFixed(2)}</span>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openMenuDialog(item)} className="h-9 w-9 hover:bg-[#8b6f47]/10"><Edit className="h-4 w-4 text-[#8b6f47]" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => deleteMenuItem(item)} className="h-9 w-9 hover:bg-red-500/10"><Trash2 className="h-4 w-4 text-red-500" /></Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* Staff View */}
          {activeView === "staff" && (
            <motion.div key="staff" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="space-y-6">
              <div className="flex flex-col sm:flex-row gap-4 justify-between">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Search staff..." value={staffSearch} onChange={(e) => setStaffSearch(e.target.value)} className="pl-10 bg-white dark:bg-zinc-800 border-[#8b6f47]/20" />
                </div>
                <div className="flex gap-2">
                  {selectedStaff.size > 0 && <Button variant="destructive" onClick={deleteSelectedStaff} disabled={isDeleting} className="gap-2"><Trash2 className="w-4 h-4" />Delete ({selectedStaff.size})</Button>}
                  <Button onClick={() => openStaffDialog()} className="gap-2 bg-[#8b6f47] hover:bg-[#7a5f3d] text-white shadow-lg"><Plus className="w-4 h-4" />Add Staff</Button>
                </div>
              </div>

              {staffLoading ? (
                <div className="flex items-center justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-[#8b6f47]" /></div>
              ) : filteredStaffMembers.length === 0 ? (
                <div className="text-center py-20"><Users className="w-16 h-16 mx-auto mb-4 text-[#8b6f47]/30" /><p className="text-muted-foreground">No staff members found</p></div>
              ) : (
                <div className="space-y-3">
                  {filteredStaffMembers.map((member, i) => (
                    <motion.div key={member.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                      <Card className="bg-white dark:bg-zinc-800 border-[#8b6f47]/10 hover:border-[#8b6f47]/30 transition-all">
                        <CardContent className="p-4 flex items-center gap-4">
                          <Checkbox checked={selectedStaff.has(member.id)} onCheckedChange={() => toggleStaffSelection(member.id)} className="data-[state=checked]:bg-[#8b6f47] data-[state=checked]:border-[#8b6f47]" />
                          <Avatar className="h-12 w-12 border-2 border-[#8b6f47]/20"><AvatarFallback className="bg-[#8b6f47]/10 text-[#8b6f47] font-semibold">{getInitials(member.full_name)}</AvatarFallback></Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-[#3d3225] dark:text-white">{member.full_name || "Unnamed"}</h4>
                              <Badge variant="secondary" className={member.role === "admin" ? "bg-[#8b6f47]/20 text-[#8b6f47]" : ""}>{member.role}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground truncate">{member.email}</p>
                          </div>
                          {member.phone && <span className="text-sm text-muted-foreground hidden md:block">{member.phone}</span>}
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openStaffDialog(member)} className="h-9 w-9 hover:bg-[#8b6f47]/10" title="Edit"><Edit className="h-4 w-4 text-[#8b6f47]" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => { setResetPasswordStaff(member); setNewPassword(generatePassword()); setResetSuccess(false); setResetPasswordDialogOpen(true) }} className="h-9 w-9 hover:bg-amber-500/10" title="Reset Password"><Key className="h-4 w-4 text-amber-500" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => { setDeletingStaff(member); setDeleteDialogOpen(true) }} className="h-9 w-9 hover:bg-red-500/10" title="Delete"><Trash2 className="h-4 w-4 text-red-500" /></Button>
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

      {/* Menu Dialog */}
      <Dialog open={menuDialogOpen} onOpenChange={setMenuDialogOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-zinc-900">
          <DialogHeader><DialogTitle>{editingMenuItem ? "Edit Item" : "Add Menu Item"}</DialogTitle></DialogHeader>
          <form onSubmit={saveMenuItem} className="space-y-4">
            <div><Label>Item Name *</Label><Input value={menuForm.name} onChange={(e) => setMenuForm({ ...menuForm, name: e.target.value })} placeholder="e.g. Classic Burger" required /></div>
            <div><Label>Category *</Label><Select value={menuForm.category} onValueChange={(v) => setMenuForm({ ...menuForm, category: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CATEGORY_VALUES.map(v => <SelectItem key={v} value={v}>{CATEGORY_LABELS[v]}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Price (RM) *</Label><Input type="number" step="0.01" min="0" value={menuForm.price} onChange={(e) => setMenuForm({ ...menuForm, price: e.target.value })} required /></div>
            <div><Label>Description</Label><Textarea value={menuForm.description} onChange={(e) => setMenuForm({ ...menuForm, description: e.target.value })} rows={2} /></div>
            <div>
              <Label>Food Image</Label>
              <div className="mt-2">
                {(imagePreview || menuForm.image_url) ? (
                  <div className="relative w-full h-32 rounded-xl overflow-hidden bg-muted mb-2"><img src={imagePreview || menuForm.image_url} alt="Preview" className="w-full h-full object-cover" /><Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2 h-7 w-7" onClick={() => { setMenuForm({ ...menuForm, image_url: "" }); setImagePreview(null) }}><X className="h-4 w-4" /></Button></div>
                ) : (<div className="w-full h-32 rounded-xl border-2 border-dashed border-[#8b6f47]/30 flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-[#8b6f47] hover:bg-[#8b6f47]/5 transition-colors" onClick={() => fileInputRef.current?.click()}>{isUploading ? <Loader2 className="h-6 w-6 animate-spin text-[#8b6f47]" /> : <><Upload className="h-6 w-6 text-[#8b6f47]/50" /><span className="text-xs text-muted-foreground">Click to upload</span></>}</div>)}
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </div>
            </div>
            <div className="flex items-center justify-between"><div><Label>Show on Menu</Label><p className="text-xs text-muted-foreground">Toggle visibility</p></div><Switch checked={menuForm.is_active} onCheckedChange={(c) => setMenuForm({ ...menuForm, is_active: c })} /></div>
            <div className="flex gap-2 pt-2"><Button type="button" variant="outline" onClick={() => setMenuDialogOpen(false)} className="flex-1">Cancel</Button><Button type="submit" disabled={menuSaving} className="flex-1 bg-[#8b6f47] hover:bg-[#7a5f3d] text-white">{menuSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingMenuItem ? "Update" : "Add"}</Button></div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Staff Dialog */}
      <Dialog open={staffDialogOpen} onOpenChange={(o) => { setStaffDialogOpen(o); if (!o) resetStaffForm() }}>
        <DialogContent className="max-w-md bg-white dark:bg-zinc-900">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Key className="w-5 h-5 text-amber-500" />{editingStaff ? "Edit Staff" : createdCredentials ? "Account Created" : "Add New Staff"}</DialogTitle>{!editingStaff && !createdCredentials && <DialogDescription>Create staff account and save credentials</DialogDescription>}</DialogHeader>
          {createdCredentials ? (
            <div className="space-y-4 mt-4">
              <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                <p className="text-sm text-green-600 font-medium mb-3">✓ Staff created! Save login info:</p>
                <div className="space-y-3">
                  <div><Label className="text-xs text-muted-foreground">Email</Label><div className="flex gap-2"><Input value={createdCredentials.email} readOnly className="font-mono text-sm" /><Button variant="outline" size="icon" onClick={() => copyToClipboard(createdCredentials.email)}><Copy className="h-4 w-4" /></Button></div></div>
                  <div><Label className="text-xs text-muted-foreground">Password</Label><div className="flex gap-2"><Input type={showPassword ? "text" : "password"} value={createdCredentials.password} readOnly className="font-mono text-sm" /><Button variant="outline" size="icon" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button><Button variant="outline" size="icon" onClick={() => copyToClipboard(createdCredentials.password)}>{passwordCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}</Button></div></div>
                </div>
              </div>
              <Button variant="outline" className="w-full" onClick={() => copyToClipboard(`Email: ${createdCredentials.email}\nPassword: ${createdCredentials.password}`)}><Copy className="h-4 w-4 mr-2" />Copy All</Button>
              <Button onClick={() => { setStaffDialogOpen(false); resetStaffForm() }} className="w-full bg-[#8b6f47] hover:bg-[#7a5f3d] text-white">Done</Button>
            </div>
          ) : (
            <form onSubmit={saveStaff} className="space-y-4 mt-2">
              <div><Label>Full Name</Label><Input value={staffForm.full_name} onChange={(e) => setStaffForm({ ...staffForm, full_name: e.target.value })} placeholder="John Doe" required /></div>
              {!editingStaff && (<><div><Label>Email</Label><Input type="email" value={staffForm.email} onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })} placeholder="staff@jpco.com" required /></div><div><Label>Password</Label><div className="flex gap-2"><div className="relative flex-1"><Input type={showPassword ? "text" : "password"} value={staffForm.password} onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })} className="pr-10" required minLength={6} /><Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-3 hover:bg-transparent" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button></div><Button type="button" variant="outline" size="icon" onClick={() => setStaffForm({ ...staffForm, password: generatePassword() })}><RefreshCw className="h-4 w-4" /></Button></div></div></>)}
              <div><Label>Phone</Label><Input type="tel" value={staffForm.phone} onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })} placeholder="+60 12 345 6789" /></div>
              <div><Label>Role</Label><Select value={staffForm.role} onValueChange={(v: "staff" | "admin") => setStaffForm({ ...staffForm, role: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="staff">Staff</SelectItem><SelectItem value="admin">Admin</SelectItem></SelectContent></Select></div>
              <div className="flex gap-2 pt-2"><Button type="button" variant="outline" onClick={() => setStaffDialogOpen(false)} className="flex-1">Cancel</Button><Button type="submit" disabled={staffSaving} className="flex-1 bg-[#8b6f47] hover:bg-[#7a5f3d] text-white">{staffSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingStaff ? "Update" : "Create"}</Button></div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Staff Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={(o) => { setDeleteDialogOpen(o); if (!o) setDeletingStaff(null) }}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-zinc-900">
          <DialogHeader><DialogTitle className="flex items-center gap-2 text-red-500"><AlertTriangle className="w-5 h-5" />Delete Staff</DialogTitle><DialogDescription>Choose how to handle <span className="font-semibold">{deletingStaff?.full_name}</span></DialogDescription></DialogHeader>
          <div className="space-y-3 mt-4">
            <button onClick={() => handleDeleteStaff("soft")} disabled={isDeleting} className="w-full p-4 rounded-xl border hover:border-amber-500 hover:bg-amber-500/5 transition-colors text-left"><div className="flex gap-3"><div className="p-2 rounded-full bg-amber-500/20"><UserMinus className="w-5 h-5 text-amber-500" /></div><div><h4 className="font-semibold">Demote to Customer</h4><p className="text-sm text-muted-foreground">Remove staff permissions only</p></div></div></button>
            <button onClick={() => handleDeleteStaff("hard")} disabled={isDeleting} className="w-full p-4 rounded-xl border border-red-500/30 hover:border-red-500 hover:bg-red-500/5 transition-colors text-left"><div className="flex gap-3"><div className="p-2 rounded-full bg-red-500/20"><UserX className="w-5 h-5 text-red-500" /></div><div><h4 className="font-semibold text-red-500">Delete Completely</h4><p className="text-sm text-muted-foreground">Permanently delete account</p></div></div></button>
          </div>
          {isDeleting && <div className="flex items-center justify-center py-4"><Loader2 className="w-6 h-6 animate-spin" /><span className="ml-2 text-muted-foreground">Processing...</span></div>}
          <div className="flex justify-end mt-4"><Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={isDeleting}>Cancel</Button></div>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetPasswordDialogOpen} onOpenChange={(o) => { setResetPasswordDialogOpen(o); if (!o) { setResetPasswordStaff(null); setResetSuccess(false) } }}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-zinc-900">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Key className="w-5 h-5 text-amber-500" />Reset Password</DialogTitle><DialogDescription>Set new password for <span className="font-semibold">{resetPasswordStaff?.full_name}</span></DialogDescription></DialogHeader>
          {resetSuccess ? (
            <div className="space-y-4 mt-4">
              <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                <p className="text-sm text-green-600 font-medium mb-3">✓ Password reset! New credentials:</p>
                <div className="space-y-3">
                  <div><Label className="text-xs text-muted-foreground">Email</Label><div className="flex gap-2"><Input value={resetPasswordStaff?.email || ""} readOnly className="font-mono text-sm" /><Button variant="outline" size="icon" onClick={() => copyToClipboard(resetPasswordStaff?.email || "")}><Copy className="h-4 w-4" /></Button></div></div>
                  <div><Label className="text-xs text-muted-foreground">New Password</Label><div className="flex gap-2"><Input type={showPassword ? "text" : "password"} value={newPassword} readOnly className="font-mono text-sm" /><Button variant="outline" size="icon" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button><Button variant="outline" size="icon" onClick={() => copyToClipboard(newPassword)}>{passwordCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}</Button></div></div>
                </div>
              </div>
              <Button variant="outline" className="w-full" onClick={() => copyToClipboard(`Email: ${resetPasswordStaff?.email}\nNew Password: ${newPassword}`)}><Copy className="h-4 w-4 mr-2" />Copy All</Button>
              <Button onClick={() => { setResetPasswordDialogOpen(false); setResetSuccess(false) }} className="w-full bg-[#8b6f47] hover:bg-[#7a5f3d] text-white">Done</Button>
            </div>
          ) : (
            <div className="space-y-4 mt-4">
              <div><Label>New Password</Label><div className="flex gap-2"><div className="relative flex-1"><Input type={showPassword ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="pr-10" minLength={6} /><Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-3 hover:bg-transparent" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button></div><Button variant="outline" size="icon" onClick={() => setNewPassword(generatePassword())}><RefreshCw className="h-4 w-4" /></Button></div><p className="text-xs text-muted-foreground">At least 6 characters</p></div>
              <div className="flex gap-2 pt-2"><Button variant="outline" onClick={() => setResetPasswordDialogOpen(false)} className="flex-1" disabled={isResetting}>Cancel</Button><Button onClick={handleResetPassword} disabled={isResetting || newPassword.length < 6} className="flex-1 bg-[#8b6f47] hover:bg-[#7a5f3d] text-white">{isResetting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}{isResetting ? "Resetting..." : "Reset"}</Button></div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
