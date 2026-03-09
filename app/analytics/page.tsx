import { DashboardHeader } from "@/components/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Users, Eye, MousePointerClick, Clock } from "lucide-react"

const analyticsData = [
  {
    title: "Total Page Views",
    value: "1,234,567",
    change: "+12.5%",
    trend: "up",
    icon: Eye,
  },
  {
    title: "Unique Visitors",
    value: "456,789",
    change: "+8.2%",
    trend: "up",
    icon: Users,
  },
  {
    title: "Click Rate",
    value: "3.45%",
    change: "-0.8%",
    trend: "down",
    icon: MousePointerClick,
  },
  {
    title: "Avg. Session Duration",
    value: "4m 32s",
    change: "+15.3%",
    trend: "up",
    icon: Clock,
  },
]

export default function AnalyticsPage() {
  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Analytics</h2>
            <p className="text-muted-foreground">Track your website and campaign performance</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {analyticsData.map((item) => (
              <Card key={item.title} className="bg-card/50 backdrop-blur-sm border-border/50">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {item.title}
                  </CardTitle>
                  <item.icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{item.value}</div>
                  <div className="flex items-center gap-1 mt-1">
                    {item.trend === "up" ? (
                      <TrendingUp className="h-3 w-3 text-emerald-500" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-500" />
                    )}
                    <span className={`text-xs ${item.trend === "up" ? "text-emerald-500" : "text-red-500"}`}>
                      {item.change}
                    </span>
                    <span className="text-xs text-muted-foreground">vs last month</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader>
              <CardTitle>Traffic Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                <p>Detailed analytics charts and data will appear here</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
