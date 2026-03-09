import { DashboardHeader } from "@/components/dashboard/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Play, Pause, MoreHorizontal } from "lucide-react"

const campaigns = [
  {
    id: 1,
    name: "Summer Sale 2024",
    status: "active",
    type: "Email",
    reach: "45,230",
    conversions: "1,234",
    budget: "$5,000",
    spent: "$3,450",
  },
  {
    id: 2,
    name: "Product Launch",
    status: "active",
    type: "Social",
    reach: "89,100",
    conversions: "2,567",
    budget: "$10,000",
    spent: "$7,890",
  },
  {
    id: 3,
    name: "Holiday Special",
    status: "paused",
    type: "Display",
    reach: "23,400",
    conversions: "567",
    budget: "$3,000",
    spent: "$1,200",
  },
  {
    id: 4,
    name: "Brand Awareness",
    status: "active",
    type: "Video",
    reach: "156,000",
    conversions: "4,521",
    budget: "$15,000",
    spent: "$12,300",
  },
  {
    id: 5,
    name: "Retargeting Q4",
    status: "draft",
    type: "Display",
    reach: "0",
    conversions: "0",
    budget: "$8,000",
    spent: "$0",
  },
]

export default function CampaignsPage() {
  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Campaigns</h2>
              <p className="text-muted-foreground">Manage your marketing campaigns</p>
            </div>
            <Button className="gap-2 bg-[#A17755] hover:bg-[#8A6548] text-white">
              <Plus className="h-4 w-4" />
              New Campaign
            </Button>
          </div>

          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader>
              <CardTitle>All Campaigns</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Campaign</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Status</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Type</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Reach</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Conversions</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Budget</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Spent</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.map((campaign) => (
                      <tr key={campaign.id} className="border-b border-border/30 hover:bg-muted/30">
                        <td className="px-4 py-4 text-sm font-medium text-foreground">{campaign.name}</td>
                        <td className="px-4 py-4">
                          <Badge 
                            variant={campaign.status === "active" ? "default" : "secondary"}
                            className={
                              campaign.status === "active" 
                                ? "bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30" 
                                : campaign.status === "paused"
                                ? "bg-amber-500/20 text-amber-500 hover:bg-amber-500/30"
                                : "bg-muted text-muted-foreground"
                            }
                          >
                            {campaign.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-4 text-sm text-muted-foreground">{campaign.type}</td>
                        <td className="px-4 py-4 text-sm text-foreground">{campaign.reach}</td>
                        <td className="px-4 py-4 text-sm text-foreground">{campaign.conversions}</td>
                        <td className="px-4 py-4 text-sm text-foreground">{campaign.budget}</td>
                        <td className="px-4 py-4 text-sm text-foreground">{campaign.spent}</td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              {campaign.status === "active" ? (
                                <Pause className="h-4 w-4" />
                              ) : (
                                <Play className="h-4 w-4" />
                              )}
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
