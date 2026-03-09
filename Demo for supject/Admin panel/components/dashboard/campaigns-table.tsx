"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Icon3D } from "./3d-icons"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

const campaigns = [
  {
    name: "Rainy Day Special",
    sentTo: "300 Users",
    attendRate: "15%",
    revenue: "RM 1,200",
    status: "completed",
  },
  {
    name: "Happy Hour Flash",
    sentTo: "450 Users",
    attendRate: "22%",
    revenue: "RM 2,100",
    status: "completed",
  },
  {
    name: "Weekend Brunch",
    sentTo: "280 Users",
    attendRate: "18%",
    revenue: "RM 980",
    status: "active",
  },
  {
    name: "Late Night Snack",
    sentTo: "520 Users",
    attendRate: "12%",
    revenue: "RM 1,450",
    status: "completed",
  },
]

export function CampaignsTable() {
  return (
    <Card className="bg-card border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-3 text-lg font-medium text-foreground">
          <Icon3D type="campaign" size={40} />
          Recent AI Campaigns
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="border-border/50 hover:bg-transparent">
              <TableHead className="text-muted-foreground">Campaign Name</TableHead>
              <TableHead className="text-muted-foreground">Sent To</TableHead>
              <TableHead className="text-muted-foreground">Attend Rate</TableHead>
              <TableHead className="text-right text-muted-foreground">Revenue</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {campaigns.map((campaign) => (
              <TableRow key={campaign.name} className="border-border/50">
                <TableCell className="font-medium text-foreground">
                  <div className="flex items-center gap-2">
                    {campaign.name}
                    {campaign.status === "active" && (
                      <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20">
                        Active
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{campaign.sentTo}</TableCell>
                <TableCell>
                  <span className="text-emerald-400">{campaign.attendRate}</span>
                </TableCell>
                <TableCell className="text-right font-medium text-foreground">{campaign.revenue}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
