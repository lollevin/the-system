"use client"

import { ChartTooltipContent } from "@/components/ui/chart"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Icon3D } from "./3d-icons"
import { ChartContainer, ChartTooltip } from "@/components/ui/chart"
import { Bar, BarChart, XAxis, YAxis, CartesianGrid } from "recharts"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"

const chartConfig = {
  traffic: {
    label: "Visits",
    color: "oklch(0.65 0.15 250)",
  },
  sales: {
    label: "Sales (RM)",
    color: "oklch(0.7 0.18 145)",
  },
}

interface ChartData {
  time: string
  traffic: number
  sales: number
}

export function TrafficSalesChart() {
  const [period, setPeriod] = useState("Week")
  const [data, setData] = useState<ChartData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  const supabase = createClient()

  useEffect(() => {
    fetchData(period)
  }, [period])

  const fetchData = async (selectedPeriod: string) => {
    setIsLoading(true)
    
    try {
      const now = new Date()
      let startDate: Date
      let groupBy: "hour" | "day" | "week"
      
      if (selectedPeriod === "Today") {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        groupBy = "hour"
      } else if (selectedPeriod === "Week") {
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        groupBy = "day"
      } else {
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        groupBy = "week"
      }

      const { data: transactions } = await supabase
        .from("transactions")
        .select("created_at, amount, type")
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: true })

      if (transactions && transactions.length > 0) {
        const chartData = aggregateData(transactions, groupBy, selectedPeriod)
        setData(chartData)
      } else {
        // Show empty state or sample data for demo
        setData(generateSampleData(selectedPeriod))
      }
    } catch (err) {
      console.error("Error fetching chart data:", err)
      setData(generateSampleData(selectedPeriod))
    } finally {
      setIsLoading(false)
    }
  }

  const aggregateData = (
    transactions: any[], 
    groupBy: "hour" | "day" | "week",
    period: string
  ): ChartData[] => {
    const grouped: { [key: string]: { traffic: number; sales: number } } = {}
    
    transactions.forEach((tx) => {
      const date = new Date(tx.created_at)
      let key: string
      
      if (groupBy === "hour") {
        key = `${date.getHours()}:00`
      } else if (groupBy === "day") {
        key = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][date.getDay()]
      } else {
        const weekNum = Math.ceil(date.getDate() / 7)
        key = `Week ${weekNum}`
      }
      
      if (!grouped[key]) {
        grouped[key] = { traffic: 0, sales: 0 }
      }
      
      grouped[key].traffic += 1
      if (tx.type === "earn" && tx.amount) {
        grouped[key].sales += tx.amount
      }
    })

    // Convert to array with proper ordering
    if (groupBy === "hour") {
      const hours = ["8AM", "10AM", "12PM", "2PM", "4PM", "6PM", "8PM", "10PM"]
      return hours.map((h) => ({
        time: h,
        traffic: grouped[h.replace("AM", ":00").replace("PM", ":00")]?.traffic || 0,
        sales: grouped[h.replace("AM", ":00").replace("PM", ":00")]?.sales || 0,
      }))
    } else if (groupBy === "day") {
      const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
      return days.map((d) => ({
        time: d,
        traffic: grouped[d]?.traffic || 0,
        sales: grouped[d]?.sales || 0,
      }))
    } else {
      return Object.entries(grouped).map(([time, data]) => ({
        time,
        ...data,
      }))
    }
  }

  const generateSampleData = (period: string): ChartData[] => {
    if (period === "Today") {
      return [
        { time: "8AM", traffic: 0, sales: 0 },
        { time: "10AM", traffic: 0, sales: 0 },
        { time: "12PM", traffic: 0, sales: 0 },
        { time: "2PM", traffic: 0, sales: 0 },
        { time: "4PM", traffic: 0, sales: 0 },
        { time: "6PM", traffic: 0, sales: 0 },
        { time: "8PM", traffic: 0, sales: 0 },
        { time: "10PM", traffic: 0, sales: 0 },
      ]
    }
    if (period === "Week") {
      return [
        { time: "Mon", traffic: 0, sales: 0 },
        { time: "Tue", traffic: 0, sales: 0 },
        { time: "Wed", traffic: 0, sales: 0 },
        { time: "Thu", traffic: 0, sales: 0 },
        { time: "Fri", traffic: 0, sales: 0 },
        { time: "Sat", traffic: 0, sales: 0 },
        { time: "Sun", traffic: 0, sales: 0 },
      ]
    }
    return [
      { time: "Week 1", traffic: 0, sales: 0 },
      { time: "Week 2", traffic: 0, sales: 0 },
      { time: "Week 3", traffic: 0, sales: 0 },
      { time: "Week 4", traffic: 0, sales: 0 },
    ]
  }

  return (
    <Card className="bg-card border-border/50">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="flex items-center gap-3 text-lg font-medium text-foreground">
            <Icon3D type="chart" size={40} />
            Traffic & Sales
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1 ml-[52px]">Admin monitoring - Customer visits & revenue</p>
        </div>
        <div className="flex gap-1">
          {["Today", "Week", "Month"].map((p) => (
            <Button
              key={p}
              variant={period === p ? "secondary" : "ghost"}
              size="sm"
              className={cn(
                "h-7 px-3 text-xs",
                period === p ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setPeriod(p)}
            >
              {p}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <BarChart data={data} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0 0)" vertical={false} />
            <XAxis 
              dataKey="time" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'oklch(0.6 0 0)', fontSize: 12 }}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'oklch(0.6 0 0)', fontSize: 12 }}
            />
            <ChartTooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null
                return (
                  <div className="rounded-lg border border-border/50 bg-background px-3 py-2 shadow-xl">
                    <p className="mb-1.5 font-medium text-foreground">{label}</p>
                    {payload.map((entry) => (
                      <div key={entry.dataKey} className="flex items-center gap-2 text-sm">
                        <div
                          className="h-2.5 w-2.5 rounded-sm"
                          style={{ backgroundColor: entry.color }}
                        />
                        <span className="text-muted-foreground">
                          {entry.dataKey === "traffic" ? "Visits" : "Sales"}:
                        </span>
                        <span className="font-mono font-medium text-foreground">
                          {entry.dataKey === "sales" ? `RM ${entry.value?.toLocaleString()}` : entry.value?.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )
              }}
            />
            <Bar 
              dataKey="traffic" 
              fill="var(--color-traffic)" 
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
            />
            <Bar 
              dataKey="sales" 
              fill="var(--color-sales)" 
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
            />
          </BarChart>
        </ChartContainer>
        <div className="mt-4 flex items-center justify-center gap-6">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: chartConfig.traffic.color }} />
            <span className="text-sm text-muted-foreground">Visits</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: chartConfig.sales.color }} />
            <span className="text-sm text-muted-foreground">Sales (RM)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
