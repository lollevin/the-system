"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Gift, Share2, ChevronRight, Loader2, Users } from "lucide-react"
import { RewardsManager } from "@/app/admin/rewards/rewards-manager"
import ReferralPage from "@/app/admin/referrals/page"
import CustomerListPage from "@/app/admin/customer-list/page"
import { Button } from "@/components/ui/button"

import { createClient } from "@/lib/supabase/client"

type Tab = "customers" | "rewards" | "referrals"

function CustomerManagementContent() {
  const [activeTab, setActiveTab] = useState<Tab>("customers")
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
    if (tab === "customers" || tab === "rewards" || tab === "referrals") {
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
      {/* Left Sidebar - Simple navigation */}
      <aside className="w-full lg:w-56 border-b lg:border-b-0 lg:border-r border-border bg-card/30 flex flex-col shrink-0">
        <nav className="flex-1 px-3 py-3 space-y-1">
          <button
            onClick={() => handleTabChange("customers")}
            className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl transition-all group ${
              activeTab === "customers"
                ? "bg-[#8b6f47] text-white shadow-md shadow-[#8b6f47]/20"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            <div className="flex items-center gap-3">
              <Users className={`h-5 w-5 ${activeTab === "customers" ? "" : "group-hover:scale-110 transition-transform"}`} />
              <span className="font-bold">Customers</span>
            </div>
            {activeTab === "customers" && <ChevronRight className="h-4 w-4 opacity-50" />}
          </button>
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
            ) : activeTab === "customers" ? (
              <CustomerListPage />
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

export default function CustomerManagementPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
      <CustomerManagementContent />
    </Suspense>
  )
}
