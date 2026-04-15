"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Camera, Loader2, Globe } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import type { User } from "@supabase/supabase-js"
import type { Profile } from "@/lib/supabase/types"
import { useLanguage } from "@/lib/i18n"

interface SettingsFormProps {
  user: User | null
  profile: Profile | null
}

export function SettingsForm({ user, profile }: SettingsFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    firstName: profile?.full_name?.split(' ')[0] || "",
    lastName: profile?.full_name?.split(' ').slice(1).join(' ') || "",
    email: user?.email || profile?.email || "",
    phone: profile?.phone || "",
  })
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    weekly: false,
  })
  const [promoBanner, setPromoBanner] = useState({
    imageUrl: "",
    link: "/pwa",
    isActive: false,
  })

  const supabase = createClient()
  const { language, setLanguage, t } = useLanguage()

  useEffect(() => {
    async function fetchPromo() {
      const { data } = await supabase
        .from("global_settings")
        .select("value")
        .eq("key", "promo_banner")
        .single()
      
      if (data?.value) {
        setPromoBanner(data.value)
      }
    }
    fetchPromo()
  }, [])

  const handleSavePromo = async () => {
    setIsLoading(true)
    try {
      const { error } = await supabase
        .from("global_settings")
        .upsert({
          key: "promo_banner",
          value: promoBanner,
          updated_at: new Date().toISOString()
        })

      if (error) throw error
      toast.success("Promo banner settings saved!")
    } catch (err: any) {
      toast.error("Failed to save promo settings", { description: err.message })
    } finally {
      setIsLoading(false)
    }
  }

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

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold text-foreground">{t("common", "settings")}</h2>
        <p className="text-muted-foreground">{t("admin", "manageAccount")}</p>
      </div>

      {/* Language Section */}
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
              onClick={() => {
                setLanguage("en")
                toast.success(t("customer", "langSetEn"))
              }}
              className={language === "en" ? "bg-[#8b6f47] hover:bg-[#7a5f3a]" : ""}
            >
              English
            </Button>
            <Button
              variant={language === "zh" ? "default" : "outline"}
              onClick={() => {
                setLanguage("zh")
                toast.success(t("customer", "langSetZh"))
              }}
              className={language === "zh" ? "bg-[#8b6f47] hover:bg-[#7a5f3a]" : ""}
            >
              中文
            </Button>
            <Button
              variant={language === "ms" ? "default" : "outline"}
              onClick={() => {
                setLanguage("ms")
                toast.success(t("customer", "langSetMs"))
              }}
              className={language === "ms" ? "bg-[#8b6f47] hover:bg-[#7a5f3a]" : ""}
            >
              Melayu
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Profile Section */}
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

      {/* App Customization Section */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle>App Promotion Banner</CardTitle>
          <CardDescription>Configure the popup banner that appears when customers open the app.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Enable Banner</p>
              <p className="text-sm text-muted-foreground">Show the promotional popup to customers on entry.</p>
            </div>
            <Switch 
              checked={promoBanner.isActive}
              onCheckedChange={(checked) => setPromoBanner(prev => ({ ...prev, isActive: checked }))}
            />
          </div>

          <Separator className="bg-border/50" />

          <div className="space-y-2">
            <Label htmlFor="bannerImage">Banner Image URL</Label>
            <Input 
              id="bannerImage" 
              placeholder="https://example.com/banner.jpg"
              value={promoBanner.imageUrl}
              onChange={(e) => setPromoBanner(prev => ({ ...prev, imageUrl: e.target.value }))}
              className="bg-background/50" 
            />
            <p className="text-[10px] text-muted-foreground">Upload your banner to a CDN or host and paste the URL here.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bannerLink">Banner Link (Optional)</Label>
            <Input 
              id="bannerLink" 
              placeholder="/pwa?view=menu"
              value={promoBanner.link}
              onChange={(e) => setPromoBanner(prev => ({ ...prev, link: e.target.value }))}
              className="bg-background/50" 
            />
          </div>

          <Button 
            onClick={handleSavePromo}
            disabled={isLoading}
            className="w-full bg-[#8b6f47] hover:bg-[#7a5f3a] text-white"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Banner Settings"
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Notifications Section */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle>{t("admin", "notifications")}</CardTitle>
          <CardDescription>{t("admin", "notificationsDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">{t("admin", "emailNotifications")}</p>
              <p className="text-sm text-muted-foreground">{t("admin", "emailNotificationsDesc")}</p>
            </div>
            <Switch 
              checked={notifications.email}
              onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, email: checked }))}
            />
          </div>
          <Separator className="bg-border/50" />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">{t("admin", "pushNotifications")}</p>
              <p className="text-sm text-muted-foreground">{t("admin", "pushNotificationsDesc")}</p>
            </div>
            <Switch 
              checked={notifications.push}
              onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, push: checked }))}
            />
          </div>
          <Separator className="bg-border/50" />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">{t("admin", "weeklyReports")}</p>
              <p className="text-sm text-muted-foreground">{t("admin", "weeklyReportsDesc")}</p>
            </div>
            <Switch 
              checked={notifications.weekly}
              onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, weekly: checked }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Security Section */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle>{t("admin", "security")}</CardTitle>
          <CardDescription>{t("admin", "securityDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">{t("admin", "twoFactor")}</p>
              <p className="text-sm text-muted-foreground">{t("admin", "twoFactorDesc")}</p>
            </div>
            <Button variant="outline">{t("admin", "enable")}</Button>
          </div>
          <Separator className="bg-border/50" />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">{t("admin", "changePassword")}</p>
              <p className="text-sm text-muted-foreground">{t("admin", "changePasswordDesc")}</p>
            </div>
            <Button variant="outline">{t("admin", "update")}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
