"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Users,
  Search,
  Star,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Gift,
  Clock,
  Phone,
  Mail,
  Cake,
  Filter,
  Download,
} from "lucide-react"
import { useLanguage } from "@/lib/i18n"

interface Customer {
  id: string
  full_name: string | null
  email: string | null
  phone: string | null
  points_balance: number
  total_spent: number
  visit_count: number
  last_visit: string | null
  birthday: string | null
  created_at: string
  role: string
}

type SortField = "full_name" | "points_balance" | "total_spent" | "visit_count" | "created_at" | "last_visit"
type FilterType = "all" | "vip" | "active" | "dormant" | "new"

export default function CustomerListPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [sortField, setSortField] = useState<SortField>("created_at")
  const [sortAsc, setSortAsc] = useState(false)
  const [filter, setFilter] = useState<FilterType>("all")
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [stats, setStats] = useState({ total: 0, active: 0, dormant: 0, vip: 0 })
  
  const supabase = createClient()
  const { t } = useLanguage()

  useEffect(() => { loadCustomers() }, [])

  const loadCustomers = async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "customer")
        .order("created_at", { ascending: false })

      if (data) {
        setCustomers(data)
        
        const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000)
        const active = data.filter(c => c.last_visit && new Date(c.last_visit) > thirtyDaysAgo).length
        const dormant = data.filter(c => !c.last_visit || new Date(c.last_visit) <= thirtyDaysAgo).length
        const vip = data.filter(c => (c.total_spent || 0) >= 1000).length
        
        setStats({ total: data.length, active, dormant, vip })
      }
    } catch (err) {
      console.error("Load customers error:", err)
    } finally {
      setLoading(false)
    }
  }

  const getVipTier = (spent: number) => {
    if (spent >= 5000) return { name: "Diamond", color: "text-blue-500", bg: "bg-blue-500/10" }
    if (spent >= 3000) return { name: "Gold", color: "text-amber-500", bg: "bg-amber-500/10" }
    if (spent >= 1000) return { name: "Silver", color: "text-gray-400", bg: "bg-gray-400/10" }
    return { name: "Bronze", color: "text-orange-600", bg: "bg-orange-600/10" }
  }

  const getDaysAgo = (date: string | null) => {
    if (!date) return "Never"
    const days = Math.floor((Date.now() - new Date(date).getTime()) / 86400000)
    if (days === 0) return "Today"
    if (days === 1) return "Yesterday"
    return `${days}d ago`
  }

  // Filter
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000)
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000)
  
  const filtered = customers.filter(c => {
    // Search
    if (search) {
      const q = search.toLowerCase()
      if (
        !c.full_name?.toLowerCase().includes(q) &&
        !c.email?.toLowerCase().includes(q) &&
        !c.phone?.includes(q)
      ) return false
    }
    
    // Filter type
    if (filter === "vip") return (c.total_spent || 0) >= 1000
    if (filter === "active") return c.last_visit && new Date(c.last_visit) > thirtyDaysAgo
    if (filter === "dormant") return !c.last_visit || new Date(c.last_visit) <= thirtyDaysAgo
    if (filter === "new") return new Date(c.created_at) > sevenDaysAgo
    return true
  })

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    let valA: any, valB: any
    switch (sortField) {
      case "full_name": valA = a.full_name || ""; valB = b.full_name || ""; break
      case "points_balance": valA = a.points_balance || 0; valB = b.points_balance || 0; break
      case "total_spent": valA = a.total_spent || 0; valB = b.total_spent || 0; break
      case "visit_count": valA = a.visit_count || 0; valB = b.visit_count || 0; break
      case "last_visit": valA = a.last_visit ? new Date(a.last_visit).getTime() : 0; valB = b.last_visit ? new Date(b.last_visit).getTime() : 0; break
      default: valA = new Date(a.created_at).getTime(); valB = new Date(b.created_at).getTime(); break
    }
    if (typeof valA === "string") return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA)
    return sortAsc ? valA - valB : valB - valA
  })

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortAsc(!sortAsc)
    else { setSortField(field); setSortAsc(false) }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null
    return sortAsc ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />
  }

  const exportCSV = () => {
    const headers = ["Name", "Phone", "Email", "Points", "Spent (RM)", "Visits", "Last Visit", "Joined"]
    const rows = sorted.map(c => [
      c.full_name || "",
      c.phone || "",
      c.email || "",
      c.points_balance || 0,
      c.total_spent || 0,
      c.visit_count || 0,
      c.last_visit ? new Date(c.last_visit).toLocaleDateString() : "Never",
      new Date(c.created_at).toLocaleDateString(),
    ])
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `jp-co-customers-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Users className="size-6 text-[#8b6f47]" />
            {t("admin", "customers")}
          </h2>
          <p className="text-muted-foreground text-sm">Manage and view all customer profiles</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="size-4 mr-1" /> Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={loadCustomers} disabled={loading}>
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total", value: stats.total, color: "text-foreground" },
          { label: "Active (30d)", value: stats.active, color: "text-emerald-500" },
          { label: "Dormant", value: stats.dormant, color: "text-red-500" },
          { label: "VIP (1k+)", value: stats.vip, color: "text-amber-500" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search & Filter */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search name, phone, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex bg-muted rounded-lg p-0.5">
          {(["all", "active", "dormant", "vip", "new"] as FilterType[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs rounded-md transition-all capitalize ${
                filter === f ? "bg-white shadow text-[#8b6f47] font-medium" : "text-muted-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Customer Table */}
      <Card>
        <CardContent className="p-0">
          {/* Table Header */}
          <div className="hidden md:grid grid-cols-7 gap-2 px-4 py-3 border-b bg-muted/50 text-xs font-medium text-muted-foreground">
            <button className="flex items-center gap-1 col-span-2" onClick={() => handleSort("full_name")}>
              Name <SortIcon field="full_name" />
            </button>
            <button className="flex items-center gap-1" onClick={() => handleSort("points_balance")}>
              Points <SortIcon field="points_balance" />
            </button>
            <button className="flex items-center gap-1" onClick={() => handleSort("total_spent")}>
              Spent <SortIcon field="total_spent" />
            </button>
            <button className="flex items-center gap-1" onClick={() => handleSort("visit_count")}>
              Visits <SortIcon field="visit_count" />
            </button>
            <button className="flex items-center gap-1" onClick={() => handleSort("last_visit")}>
              Last Visit <SortIcon field="last_visit" />
            </button>
            <button className="flex items-center gap-1" onClick={() => handleSort("created_at")}>
              Joined <SortIcon field="created_at" />
            </button>
          </div>

          {/* Rows */}
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <RefreshCw className="size-5 animate-spin mr-2" /> Loading...
            </div>
          ) : sorted.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="size-12 mx-auto mb-3 opacity-30" />
              <p>No customers found</p>
            </div>
          ) : (
            <div className="divide-y">
              {sorted.map(c => {
                const tier = getVipTier(c.total_spent || 0)
                const isExpanded = expandedId === c.id
                return (
                  <div key={c.id}>
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : c.id)}
                      className="w-full text-left md:grid md:grid-cols-7 gap-2 px-4 py-3 hover:bg-muted/30 transition-colors"
                    >
                      {/* Name + Tier */}
                      <div className="col-span-2 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#8b6f47]/10 flex items-center justify-center shrink-0">
                          <span className="text-sm font-medium text-[#8b6f47]">
                            {c.full_name?.[0]?.toUpperCase() || "?"}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium truncate">{c.full_name || "No Name"}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${tier.bg} ${tier.color}`}>
                              <Star className="size-2.5 inline mr-0.5" />{tier.name}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate md:hidden">
                            {c.phone || c.email || "—"}
                          </p>
                        </div>
                      </div>
                      
                      {/* Points */}
                      <div className="hidden md:flex items-center">
                        <span className="font-semibold text-[#8b6f47]">{c.points_balance || 0}</span>
                      </div>
                      
                      {/* Spent */}
                      <div className="hidden md:flex items-center text-sm">
                        RM {(c.total_spent || 0).toLocaleString()}
                      </div>
                      
                      {/* Visits */}
                      <div className="hidden md:flex items-center text-sm">
                        {c.visit_count || 0}
                      </div>
                      
                      {/* Last Visit */}
                      <div className="hidden md:flex items-center text-sm text-muted-foreground">
                        {getDaysAgo(c.last_visit)}
                      </div>
                      
                      {/* Joined */}
                      <div className="hidden md:flex items-center text-sm text-muted-foreground">
                        {new Date(c.created_at).toLocaleDateString("en-MY", { day: "2-digit", month: "short", year: "2-digit" })}
                      </div>

                      {/* Mobile stats row */}
                      <div className="md:hidden flex gap-4 mt-1 text-xs text-muted-foreground pl-12">
                        <span>{c.points_balance || 0} pts</span>
                        <span>RM {c.total_spent || 0}</span>
                        <span>{c.visit_count || 0} visits</span>
                        <span>{getDaysAgo(c.last_visit)}</span>
                      </div>
                    </button>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-1 bg-muted/20 border-t">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                          {c.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="size-3.5 text-muted-foreground" />
                              <span>{c.phone}</span>
                            </div>
                          )}
                          {c.email && (
                            <div className="flex items-center gap-2">
                              <Mail className="size-3.5 text-muted-foreground" />
                              <span className="truncate">{c.email}</span>
                            </div>
                          )}
                          {c.birthday && (
                            <div className="flex items-center gap-2">
                              <Cake className="size-3.5 text-pink-500" />
                              <span>{new Date(c.birthday).toLocaleDateString("en-MY", { day: "2-digit", month: "short" })}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <Clock className="size-3.5 text-muted-foreground" />
                            <span>Joined {new Date(c.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center">
        Showing {sorted.length} of {customers.length} customers
      </p>
    </div>
  )
}
