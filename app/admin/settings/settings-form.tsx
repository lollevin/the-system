"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Camera, Loader2, Globe, ArrowLeft, User, Image as ImageIcon, ChevronRight, ChevronDown, Upload, X, Smartphone, Maximize2, Layout, Square } from "lucide-react"
import NextImage from "next/image"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import type { User as SupabaseUser } from "@supabase/supabase-js"
import type { Profile } from "@/lib/supabase/types"
import { useLanguage } from "@/lib/i18n"
import { motion, AnimatePresence } from "framer-motion"

interface SettingsFormProps {
  user: SupabaseUser | null
  profile: Profile | null
}

type Tab = "profile" | "banner"
type BannerType = "login" | "topbar" | "popup"

interface BannerConfig {
  imageUrl: string
  imageFile?: File
  link: string
  isActive: boolean
}

export function SettingsForm({ user, profile }: SettingsFormProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>("profile")
  const [expandedBanner, setExpandedBanner] = useState<BannerType | null>("login")
  const [previewBanner, setPreviewBanner] = useState<BannerType>("login")
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  
  const loginInputRef = useRef<HTMLInputElement>(null)
  const topbarInputRef = useRef<HTMLInputElement>(null)
  const popupInputRef = useRef<HTMLInputElement>(null)
  
  const [formData, setFormData] = useState({
    firstName: profile?.full_name?.split(' ')[0] || "",
    lastName: profile?.full_name?.split(' ').slice(1).join(' ') || "",
    email: user?.email || profile?.email || "",
    phone: profile?.phone || "",
  })
  const [banners, setBanners] = useState<Record<BannerType, BannerConfig>>({
    login: { imageUrl: "", link: "/pwa", isActive: false },
    topbar: { imageUrl: "", link: "/pwa", isActive: false },
    popup: { imageUrl: "", link: "/pwa", isActive: false },
  })

  const supabase = createClient()
  const { language, setLanguage, t } = useLanguage()

  useEffect(() => {
    async function fetchBanners() {
      const { data } = await supabase
        .from("global_settings")
        .select("key, value")
        .in("key", ["banner_login", "banner_topbar", "banner_popup"])
      
      if (data) {
        const newBanners = { ...banners }
        data.forEach((item) => {
          const key = item.key.replace("banner_", "") as BannerType
          if (newBanners[key] && item.value) {
            newBanners[key] = { ...newBanners[key], ...item.value }
          }
        })
        setBanners(newBanners)
      }
    }
    fetchBanners()
  }, [])

  const uploadImage = async (file: File, bannerType: BannerType): Promise<string> => {
    const fileExt = file.name.split('.').pop()
    const fileName = `banner_${bannerType}_${Date.now()}.${fileExt}`
    const filePath = `banners/${fileName}`
    const { error: uploadError } = await supabase.storage.from("public-assets").upload(filePath, file, { upsert: true })
    if (uploadError) throw uploadError
    const { data } = supabase.storage.from("public-assets").getPublicUrl(filePath)
    return data.publicUrl
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, bannerType: BannerType) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file"); return }
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be less than 5MB"); return }
    setIsUploading(true)
    try {
      const localUrl = URL.createObjectURL(file)
      setBanners(prev => ({ ...prev, [bannerType]: { ...prev[bannerType], imageUrl: localUrl, imageFile: file } }))
      setPreviewBanner(bannerType)
      toast.success("Image loaded! Click Save to upload.")
    } catch { toast.error("Failed to load image") }
    finally { setIsUploading(false) }
  }

  const handleSaveBanner = async (bannerType: BannerType) => {
    setIsLoading(true)
    try {
      let imageUrl = banners[bannerType].imageUrl
      if (banners[bannerType].imageFile) {
        imageUrl = await uploadImage(banners[bannerType].imageFile!, bannerType)
        setBanners(prev => ({ ...prev, [bannerType]: { ...prev[bannerType], imageUrl, imageFile: undefined } }))
      }
      const { error } = await supabase.from("global_settings").upsert({
        key: `banner_${bannerType}`,
        value: { imageUrl, link: banners[bannerType].link, isActive: banners[bannerType].isActive },
        updated_at: new Date().toISOString()
      })
      if (error) throw error
      toast.success("Banner saved!")
    } catch (err: any) { toast.error("Failed to save", { description: err.message }) }
    finally { setIsLoading(false) }
  }

  const clearImage = (bannerType: BannerType) => {
    setBanners(prev => ({ ...prev, [bannerType]: { ...prev[bannerType], imageUrl: "", imageFile: undefined } }))
  }

  const getInputRef = (type: BannerType) => {
    if (type === "login") return loginInputRef
    if (type === "topbar") return topbarInputRef
    return popupInputRef
  }

  const bannerTypes = [
    { id: "login" as BannerType, label: "Banner when login", desc: "Fullscreen banner when customer opens app", icon: Maximize2 },
    { id: "topbar" as BannerType, label: "Banner on top of app", desc: "Horizontal banner strip at top", icon: Layout },
    { id: "popup" as BannerType, label: "Banner of pop out", desc: "Popup banner like game ads", icon: Square },
  ]

  const handleSave = async () => {
    if (!user) return
    
    setIsLoading(true)
    try {
      const fullName = `${formData.firstName} ${formData.lastName}`.trim()
      
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          phone: formData.phone,
        })
        .eq("id", user.id)

      if (error) throw error
      
      toast.success(t("customer", "settingsSaved"))
    } catch (err: any) {
      toast.error("Failed to save settings", { description: err.message })
    } finally {
      setIsLoading(false)
    }
  }

  const initials = profile?.full_name 
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'AD'

  const tabs = [
    { id: "profile" as Tab, label: "Profile", icon: User },
    { id: "banner" as Tab, label: "Banner", icon: ImageIcon },
  ]

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-background">
      {/* Left Sidebar */}
      <aside className="w-full lg:w-56 border-b lg:border-b-0 lg:border-r border-border bg-card/30 flex flex-col shrink-0">
        <div className="p-4">
          <Button 
            variant="outline" 
            onClick={() => router.push("/admin")}
            className="w-full justify-start"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
        
        <nav className="flex-1 px-3 space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all group ${activeTab === tab.id ? "bg-[#8b6f47] text-white shadow-md shadow-[#8b6f47]/20" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`h-5 w-5 ${activeTab === tab.id ? "" : "group-hover:scale-110 transition-transform"}`} />
                  <span className="font-medium">{tab.label}</span>
                </div>
                {activeTab === tab.id && <ChevronRight className="h-4 w-4 opacity-50" />}
              </button>
            )
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-card/10">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border/50 px-6 py-4">
          <h1 className="text-xl font-bold">Settings</h1>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
            className="p-6"
          >
            {activeTab === "profile" ? (
              <div className="space-y-6">
                {/* Language */}
                <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="h-5 w-5" />
                      {t("common", "language")}
                    </CardTitle>
                    <CardDescription>{t("admin", "selectLanguage")}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-3 flex-wrap">
                      <Button
                        variant={language === "en" ? "default" : "outline"}
                        onClick={() => { setLanguage("en"); toast.success(t("customer", "langSetEn")); }}
                        className={language === "en" ? "bg-[#8b6f47] hover:bg-[#7a5f3a]" : ""}
                      >
                        English
                      </Button>
                      <Button
                        variant={language === "zh" ? "default" : "outline"}
                        onClick={() => { setLanguage("zh"); toast.success(t("customer", "langSetZh")); }}
                        className={language === "zh" ? "bg-[#8b6f47] hover:bg-[#7a5f3a]" : ""}
                      >
                        ??
                      </Button>
                      <Button
                        variant={language === "ms" ? "default" : "outline"}
                        onClick={() => { setLanguage("ms"); toast.success(t("customer", "langSetMs")); }}
                        className={language === "ms" ? "bg-[#8b6f47] hover:bg-[#7a5f3a]" : ""}
                      >
                        Melayu
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Profile */}
                <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                  <CardHeader>
                    <CardTitle>{t("admin", "profile")}</CardTitle>
                    <CardDescription>{t("admin", "profileDesc")}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center gap-6">
                      <div className="relative">
                        <Avatar className="h-20 w-20">
                          <AvatarFallback className="bg-[#8b6f47] text-white text-xl">{initials}</AvatarFallback>
                        </Avatar>
                        <Button 
                          size="icon" 
                          className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-[#8b6f47] hover:bg-[#7a5f3a] text-white"
                        >
                          <Camera className="h-4 w-4" />
                        </Button>
                      </div>
                      <div>
                        <h3 className="font-medium text-foreground">{profile?.full_name || "Admin"}</h3>
                        <p className="text-sm text-muted-foreground capitalize">{profile?.role || "Administrator"}</p>
                      </div>
                    </div>

                    <Separator className="bg-border/50" />

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">{t("admin", "firstName")}</Label>
                        <Input 
                          id="firstName" 
                          value={formData.firstName}
                          onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                          className="bg-background/50" 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">{t("admin", "lastName")}</Label>
                        <Input 
                          id="lastName" 
                          value={formData.lastName}
                          onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                          className="bg-background/50" 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input 
                          id="email" 
                          type="email" 
                          value={formData.email}
                          disabled
                          className="bg-background/50 opacity-60" 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">{t("admin", "phone")}</Label>
                        <Input 
                          id="phone" 
                          type="tel" 
                          value={formData.phone}
                          onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                          placeholder="+60 12 345 6789"
                          className="bg-background/50" 
                        />
                      </div>
                    </div>

                    <Button 
                      onClick={handleSave}
                      disabled={isLoading}
                      className="bg-[#8b6f47] hover:bg-[#7a5f3a] text-white"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t("admin", "saving")}
                        </>
                      ) : (
                        t("admin", "saveChanges")
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="flex flex-col xl:flex-row gap-6">
                {/* Banner Settings */}
                <div className="flex-1 space-y-4 max-w-2xl">
                  {bannerTypes.map((banner) => {
                    const Icon = banner.icon
                    const isExpanded = expandedBanner === banner.id
                    const config = banners[banner.id]
                    return (
                      <motion.div key={banner.id} layout className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl overflow-hidden">
                        <button onClick={() => { setExpandedBanner(isExpanded ? null : banner.id); setPreviewBanner(banner.id) }} className="w-full flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${config.isActive ? "bg-green-500/10 text-green-600" : "bg-muted text-muted-foreground"}`}>
                              <Icon className="h-5 w-5" />
                            </div>
                            <div className="text-left">
                              <p className="font-medium">{banner.label}</p>
                              <p className="text-xs text-muted-foreground">{banner.desc}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {config.isActive && <span className="px-2 py-1 text-xs bg-green-500/10 text-green-600 rounded-full">Active</span>}
                            <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}><ChevronDown className="h-5 w-5 text-muted-foreground" /></motion.div>
                          </div>
                        </button>
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
                              <div className="p-4 pt-0 space-y-4 border-t border-border/50">
                                <div className="flex items-center justify-between pt-4">
                                  <div><p className="font-medium">Enable this banner</p><p className="text-xs text-muted-foreground">Show to customers</p></div>
                                  <Switch checked={config.isActive} onCheckedChange={(checked) => setBanners(prev => ({ ...prev, [banner.id]: { ...prev[banner.id], isActive: checked } }))} />
                                </div>
                                <div className="space-y-2">
                                  <Label>Banner Image</Label>
                                  <input ref={getInputRef(banner.id)} type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, banner.id)} />
                                  {config.imageUrl ? (
                                    <div className="relative group">
                                      <div className="relative w-full h-40 rounded-lg overflow-hidden border border-border">
                                        <NextImage src={config.imageUrl} alt="Banner" fill className="object-cover" />
                                      </div>
                                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                                        <Button size="sm" variant="secondary" onClick={() => getInputRef(banner.id).current?.click()}><Upload className="h-4 w-4 mr-1" />Change</Button>
                                        <Button size="sm" variant="destructive" onClick={() => clearImage(banner.id)}><X className="h-4 w-4 mr-1" />Remove</Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <button onClick={() => getInputRef(banner.id).current?.click()} className="w-full h-40 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 hover:border-[#8b6f47] hover:bg-[#8b6f47]/5 transition-colors">
                                      <Upload className="h-8 w-8 text-muted-foreground" /><p className="text-sm text-muted-foreground">Click to upload</p><p className="text-xs text-muted-foreground">PNG, JPG up to 5MB</p>
                                    </button>
                                  )}
                                </div>
                                <div className="space-y-2">
                                  <Label>Click Link (Optional)</Label>
                                  <Input placeholder="/pwa?view=menu" value={config.link} onChange={(e) => setBanners(prev => ({ ...prev, [banner.id]: { ...prev[banner.id], link: e.target.value } }))} className="bg-background/50" />
                                </div>
                                <Button onClick={() => handleSaveBanner(banner.id)} disabled={isLoading || isUploading} className="w-full bg-[#8b6f47] hover:bg-[#7a5f3a] text-white">
                                  {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : "Save Banner"}
                                </Button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    )
                  })}
                </div>
                {/* Phone Preview */}
                <div className="xl:w-80 shrink-0">
                  <div className="sticky top-24">
                    <div className="flex items-center gap-2 mb-4"><Smartphone className="h-5 w-5 text-[#8b6f47]" /><h2 className="text-lg font-semibold">Preview</h2></div>
                    <div className="relative mx-auto w-[280px]">
                      <div className="relative bg-black rounded-[3rem] p-3 shadow-2xl">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-black rounded-b-3xl z-20" />
                        <div className="relative bg-white rounded-[2.5rem] overflow-hidden h-[500px]">
                          <div className="h-12 bg-gray-100 flex items-end justify-center pb-1"><div className="w-20 h-1 bg-black rounded-full" /></div>
                          <div className="relative h-[452px] bg-gradient-to-b from-amber-50 to-white">
                            {/* Top bar banner preview */}
                            {previewBanner === "topbar" && (
                              <motion.div initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-full h-16 relative">
                                {banners.topbar.imageUrl ? (
                                  <NextImage src={banners.topbar.imageUrl} alt="Top" fill className="object-cover" />
                                ) : (
                                  <div className="w-full h-full bg-gradient-to-r from-[#8b6f47] to-[#a8845a] flex items-center justify-center">
                                    <p className="text-white text-xs font-medium">Top Banner Area</p>
                                  </div>
                                )}
                              </motion.div>
                            )}
                            <div className="p-4 space-y-3">
                              <div className="h-20 bg-gradient-to-r from-[#8b6f47]/20 to-[#8b6f47]/10 rounded-2xl flex items-center justify-center"><p className="text-xs text-[#8b6f47] font-medium">Welcome Card</p></div>
                              <div className="grid grid-cols-3 gap-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-xl" />)}</div>
                              <div className="h-24 bg-gray-100 rounded-xl" />
                            </div>
                            {/* Login fullscreen banner preview */}
                            {previewBanner === "login" && (
                              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-10">
                                {banners.login.imageUrl ? (
                                  <NextImage src={banners.login.imageUrl} alt="Login" fill className="object-cover" />
                                ) : (
                                  <div className="w-full h-full bg-gradient-to-br from-[#8b6f47] via-[#a8845a] to-[#c4a574] flex flex-col items-center justify-center gap-2">
                                    <Maximize2 className="h-8 w-8 text-white/80" />
                                    <p className="text-white text-sm font-medium">Fullscreen Banner</p>
                                    <p className="text-white/70 text-xs">Shows when app opens</p>
                                  </div>
                                )}
                                <button className="absolute top-2 right-3 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center"><X className="h-3 w-3 text-white" /></button>
                              </motion.div>
                            )}
                            {/* Popup banner preview */}
                            {previewBanner === "popup" && (
                              <>
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/50 z-10" />
                                <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", damping: 20 }} className="absolute inset-0 z-20 flex items-center justify-center p-6">
                                  <div className="relative w-full max-w-[180px] rounded-2xl overflow-hidden shadow-2xl">
                                    {banners.popup.imageUrl ? (
                                      <NextImage src={banners.popup.imageUrl} alt="Popup" width={180} height={250} className="w-full h-auto" />
                                    ) : (
                                      <div className="w-full h-[220px] bg-gradient-to-br from-[#8b6f47] via-[#a8845a] to-[#c4a574] flex flex-col items-center justify-center gap-2">
                                        <Square className="h-8 w-8 text-white/80" />
                                        <p className="text-white text-sm font-medium">Popup Ad</p>
                                        <p className="text-white/70 text-xs text-center px-4">Like game ads</p>
                                      </div>
                                    )}
                                    <button className="absolute top-2 right-2 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center"><X className="h-3 w-3 text-white" /></button>
                                  </div>
                                </motion.div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-center gap-2 mt-4">
                      {bannerTypes.map((b) => (
                        <button key={b.id} onClick={() => setPreviewBanner(b.id)} className={`px-3 py-1.5 text-xs rounded-full transition-all ${previewBanner === b.id ? "bg-[#8b6f47] text-white" : "bg-secondary text-muted-foreground hover:bg-secondary/80"}`}>
                          {b.id === "login" ? "Login" : b.id === "topbar" ? "Top" : "Popup"}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-center text-muted-foreground mt-3">Click to preview each banner type</p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}
