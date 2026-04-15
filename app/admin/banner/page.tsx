"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Loader2, Megaphone, ArrowLeft } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

export default function BannerPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [promoBanner, setPromoBanner] = useState({
    imageUrl: "",
    link: "/pwa",
    isActive: false,
  })
  
  const supabase = createClient()
  const router = useRouter()

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

  const handleSave = async () => {
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
      toast.success("Banner settings saved!")
    } catch (err: any) {
      toast.error("Failed to save banner settings", { description: err.message })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">App Banner Settings</h1>
          <p className="text-muted-foreground">Manage the promotional popup for your customers.</p>
        </div>
      </div>

      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
            Promo Banner
          </CardTitle>
          <CardDescription>
            This banner will pop up when customers open the app.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 rounded-xl bg-primary/5 border border-primary/10">
            <div>
              <p className="font-semibold text-foreground">Active Status</p>
              <p className="text-xs text-muted-foreground">Turn the banner popup on or off.</p>
            </div>
            <Switch 
              checked={promoBanner.isActive}
              onCheckedChange={(checked) => setPromoBanner(prev => ({ ...prev, isActive: checked }))}
            />
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bannerImage">Banner Image URL</Label>
              <Input 
                id="bannerImage" 
                placeholder="https://your-image-url.com/banner.jpg"
                value={promoBanner.imageUrl}
                onChange={(e) => setPromoBanner(prev => ({ ...prev, imageUrl: e.target.value }))}
                className="bg-background/50" 
              />
              <p className="text-[10px] text-muted-foreground">Enter the direct link to your promotional image.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bannerLink">Action Link (Optional)</Label>
              <Input 
                id="bannerLink" 
                placeholder="/pwa?view=menu"
                value={promoBanner.link}
                onChange={(e) => setPromoBanner(prev => ({ ...prev, link: e.target.value }))}
                className="bg-background/50" 
              />
              <p className="text-[10px] text-muted-foreground">Where should customers go when they click the banner?</p>
            </div>
          </div>

          <Button 
            onClick={handleSave}
            disabled={isLoading}
            className="w-full bg-[#8b6f47] hover:bg-[#7a5f3a] text-white shadow-lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving Changes...
              </>
            ) : (
              "Save Settings"
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Preview Section */}
      <div className="pt-4">
        <p className="text-sm font-medium mb-4 text-muted-foreground uppercase tracking-widest text-center">Preview</p>
        <div className="relative mx-auto w-[240px] aspect-[3/4] rounded-2xl border-8 border-slate-800 bg-white overflow-hidden shadow-2xl">
          {promoBanner.imageUrl ? (
            <img src={promoBanner.imageUrl} alt="Preview" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-slate-50 text-slate-400 text-center">
              <Megaphone className="h-10 w-10 mb-2 opacity-20" />
              <p className="text-xs">Image preview will appear here</p>
            </div>
          )}
          <div className="absolute top-2 right-2 h-6 w-6 rounded-full bg-black/20 flex items-center justify-center text-white backdrop-blur-sm">
            <span className="text-[10px] font-bold">X</span>
          </div>
        </div>
      </div>
    </div>
  )
}
