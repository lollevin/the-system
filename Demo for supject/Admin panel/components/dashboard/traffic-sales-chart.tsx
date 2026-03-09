"use client"

import { ChartTooltipContent } from "@/components/ui/chart"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Icon3D } from "./3d-icons"
import { ChartContainer, ChartTooltip } from "@/components/ui/chart"
import { Bar, BarChart, XAxis, YAxis, CartesianGrid } from "recharts"
import { cn } from "@/lib/utils"

const chartConfig = {
  traffic: {
    label: "Traffic",
    color: "oklch(0.65 0.15 250)",
  },
  sales: {
    label: "Sales",
    color: "oklch(0.7 0.18 145)",
  },
}

const generateData = (period: string) => {
  if (period === "Today") {
    return [
      { time: "8AM", traffic: 45, sales: 12 },
      { time: "10AM", traffic: 120, sales: 45 },
      { time: "12PM", traffic: 280, sales: 95 },
      { time: "2PM", traffic: 210, sales: 78 },
      { time: "4PM", traffic: 190, sales: 62 },
      { time: "6PM", traffic: 310, sales: 120 },
      { time: "8PM", traffic: 380, sales: 145 },
      { time: "10PM", traffic: 220, sales: 85 },
    ]
  }
  if (period === "Week") {
    return [
      { time: "Mon", traffic: 890, sales: 320 },
      { time: "Tue", traffic: 720, sales: 280 },
      { time: "Wed", traffic: 950, sales: 410 },
      { time: "Thu", traffic: 1100, sales: 520 },
      { time: "Fri", traffic: 1450, sales: 680 },
      { time: "Sat", traffic: 1680, sales: 780 },
      { time: "Sun", traffic: 1420, sales: 620 },
    ]
  }
  return [
    { time: "Week 1", traffic: 5200, sales: 1850 },
    { time: "Week 2", traffic: 6100, sales: 2200 },
    { time: "Week 3", traffic: 5800, sales: 2050 },
    { time: "Week 4", traffic: 7200, sales: 2650 },
  ]
}

export function TrafficSalesChart() {
  const [period, setPeriod] = useState("Week")
  const data = generateData(period)

  return (
    <Card className="bg-card border-border/50">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-3 text-lg font-medium text-foreground">
          <Icon3D type="chart" size={40} />
          Traffic & Sales
        </CardTitle>
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
                          {entry.dataKey === "traffic" ? "Traffic" : "Sales"}:
                        </span>
                        <span className="font-mono font-medium text-foreground">
                          {entry.value?.toLocaleString()}
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
            <span className="text-sm text-muted-foreground">Traffic</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: chartConfig.sales.color }} />
            <span className="text-sm text-muted-foreground">Sales</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
