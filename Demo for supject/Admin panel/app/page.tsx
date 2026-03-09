import { DashboardHeader } from "@/components/dashboard/header"
import { KPICards } from "@/components/dashboard/kpi-cards"
import { TrafficSalesChart } from "@/components/dashboard/traffic-sales-chart"
import { AICopilot } from "@/components/dashboard/ai-copilot"
import { CampaignsTable } from "@/components/dashboard/campaigns-table"

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* AI Copilot Section - Prominent at Top */}
          <section aria-label="AI Marketing Assistant">
            <AICopilot />
          </section>

          {/* KPI Cards Section */}
          <section aria-label="Key Performance Indicators">
            <KPICards />
          </section>

          {/* Main Content Grid */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Chart Section */}
            <section aria-label="Traffic and Sales Chart">
              <TrafficSalesChart />
            </section>

            {/* Campaigns Table */}
            <section aria-label="Recent AI Campaigns">
              <CampaignsTable />
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}
