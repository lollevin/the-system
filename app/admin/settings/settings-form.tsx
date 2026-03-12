"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Camera, Loader2, Globe, MapPin } from "lucide-react"
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

  const [shopSettings, setShopSettings] = useState({
    shop_name: "JP&Co",
    address: "Pavilion Bukit Jalil, Kuala Lumpur",
    lat: "3.05042",
    lng: "101.67101",
    radius_km: "5",
  })
  const [shopSaving, setShopSaving] = useState(false)

  const supabase = createClient()
  const { language, setLanguage, t } = useLanguage()

  useEffect(() => {
    fetch("/api/admin/shop-settings")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) setShopSettings({
          shop_name: data.shop_name || "JP&Co",
          address: data.address || "",
          lat: String(data.lat || "3.05042"),
          lng: String(data.lng || "101.67101"),
          radius_km: String(data.radius_km || "5"),
        })
      })
      .catch(() => {})
  }, [])

  const handleShopSave = async () => {
    setShopSaving(true)
    try {
      const res = await fetch("/api/admin/shop-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop_name: shopSettings.shop_name,
          address: shopSettings.address,
          lat: parseFloat(shopSettings.lat),
          lng: parseFloat(shopSettings.lng),
          radius_km: parseFloat(shopSettings.radius_km),
        }),
      })
      if (res.ok) toast.success("Shop location saved!")
      else toast.error("Failed to save shop location")
    } catch {
      toast.error("Failed to save shop location")
    } finally {
      setShopSaving(false)
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

      {/* Shop Location Section */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Shop Location
          </CardTitle>
          <CardDescription>Configure your shop location for competitor map analysis</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="shopName">Shop Name</Label>
              <Input
                id="shopName"
                value={shopSettings.shop_name}
                onChange={(e) => setShopSettings(prev => ({ ...prev, shop_name: e.target.value }))}
                className="bg-background/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shopAddress">Address</Label>
              <Input
                id="shopAddress"
                value={shopSettings.address}
                onChange={(e) => setShopSettings(prev => ({ ...prev, address: e.target.value }))}
                className="bg-background/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shopLat">Latitude</Label>
              <Input
                id="shopLat"
                type="number"
                step="0.0001"
                value={shopSettings.lat}
                onChange={(e) => setShopSettings(prev => ({ ...prev, lat: e.target.value }))}
                className="bg-background/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shopLng">Longitude</Label>
              <Input
                id="shopLng"
                type="number"
                step="0.0001"
                value={shopSettings.lng}
                onChange={(e) => setShopSettings(prev => ({ ...prev, lng: e.target.value }))}
                className="bg-background/50"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="shopRadius">Search Radius (km)</Label>
              <Input
                id="shopRadius"
                type="number"
                step="0.5"
                min="0.5"
                max="50"
                value={shopSettings.radius_km}
                onChange={(e) => setShopSettings(prev => ({ ...prev, radius_km: e.target.value }))}
                className="bg-background/50"
              />
            </div>
          </div>
          <Button
            onClick={handleShopSave}
            disabled={shopSaving}
            className="bg-[#8b6f47] hover:bg-[#7a5f3a] text-white"
          >
            {shopSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Location"
            )}
          </Button>
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
