"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Gift, Share2, ArrowLeft, Heart, ChevronRight, LayoutDashboard, Loader2 } from "lucide-react"
import { RewardsManager } from "@/app/admin/rewards/rewards-manager"
import ReferralPage from "@/app/admin/referrals/page"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

import { createClient } from "@/lib/supabase/client"

type Tab = "rewards" | "referrals"

function GrowthContent() {
  const [activeTab, setActiveTab] = useState<Tab>("rewards")
  const [vouchers, setVouchers] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true)
      try {
        // Fetch vouchers
        const { data: vouchersData } = await supabase
          .from("vouchers")
          .select("*, target_customer:profiles!vouchers_target_customer_id_fkey(id, full_name, phone)")
          .order("created_at", { ascending: false })
        
        // Fetch customers for the personal voucher picker
        const { data: customersData } = await supabase
          .from("profiles")
          .select("id, full_name, phone")
          .eq("role", "customer")
          .order("full_name")

        if (vouchersData) setVouchers(vouchersData)
        if (customersData) setCustomers(customersData)
      } catch (error) {
        console.error("Error fetching growth data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  useEffect(() => {
    const tab = searchParams.get("tab")
    if (tab === "rewards" || tab === "referrals") {
      setActiveTab(tab)
    }
  }, [searchParams])

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab)
    const url = new URL(window.location.href)
    url.searchParams.set("tab", tab)
    window.history.pushState({}, "", url.toString())
  }

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-120px)] bg-background rounded-2xl border border-border/50 overflow-hidden shadow-sm">
      {/* Secondary Sidebar (Left Navigation) */}
      <aside className="w-full lg:w-72 border-b lg:border-b-0 lg:border-r border-border bg-card/30 backdrop-blur-md flex flex-col shrink-0">
        <div className="p-6 space-y-4">
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full justify-start text-[#8b6f47] hover:text-[#7a5f3a] hover:bg-[#8b6f47]/5 px-2"
            onClick={() => router.push("/admin")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Overview Maps
          </Button>
          
          <div className="flex items-center gap-3 px-2 pt-2">
            <div className="h-10 w-10 rounded-xl bg-[#8b6f47]/10 flex items-center justify-center text-[#8b6f47]">
              <Heart className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-foreground leading-none">Customer Hub</h2>
              <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider font-semibold">Loyalty & Growth</p>
            </div>
          </div>
        </div>

        <Separator className="opacity-50" />

        <nav className="flex-1 p-4 space-y-2">
          <button
            onClick={() => handleTabChange("rewards")}
            className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl transition-all group ${
              activeTab === "rewards"
                ? "bg-[#8b6f47] text-white shadow-md shadow-[#8b6f47]/20"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            <div className="flex items-center gap-3">
              <Gift className={`h-5 w-5 ${activeTab === "rewards" ? "" : "group-hover:scale-110 transition-transform"}`} />
              <span className="font-bold">Rewards</span>
            </div>
            {activeTab === "rewards" && <ChevronRight className="h-4 w-4 opacity-50" />}
          </button>

          <button
            onClick={() => handleTabChange("referrals")}
            className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl transition-all group ${
              activeTab === "referrals"
                ? "bg-[#8b6f47] text-white shadow-md shadow-[#8b6f47]/20"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            <div className="flex items-center gap-3">
              <Share2 className={`h-5 w-5 ${activeTab === "referrals" ? "" : "group-hover:scale-110 transition-transform"}`} />
              <span className="font-bold">Share & Earn</span>
            </div>
            {activeTab === "referrals" && <ChevronRight className="h-4 w-4 opacity-50" />}
          </button>
        </nav>

        <div className="hidden lg:block p-6 border-t border-border/50">
          <div className="rounded-xl bg-secondary/50 p-4 border border-border/50">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Navigation Guide</p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Use the sidebar to manage customer loyalty programs. Click the top button to return to the map.
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-card/10">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
            className="p-6 lg:p-10"
          >
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-[#8b6f47]" />
              </div>
            ) : activeTab === "rewards" ? (
              <RewardsManager initialVouchers={vouchers} customers={customers} />
            ) : (
              <ReferralPage />
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>

  )
}

export default function GrowthPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
      <GrowthContent />
    </Suspense>
  )
}
