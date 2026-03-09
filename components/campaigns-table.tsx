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
import { MessageSquare, Sparkles } from "lucide-react"
import { Button } from "./ui/button"
import Link from "next/link"

interface Campaign {
  id: string
  name: string
  recipients_count?: number
  sent_count?: number
  status?: string
}

interface CampaignsTableProps {
  campaigns?: Campaign[]
}

export function CampaignsTable({ campaigns }: CampaignsTableProps) {
  const hasCampaigns = campaigns && campaigns.length > 0
  
  return (
    <Card className="bg-card border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-3 text-lg font-medium text-foreground">
          <Icon3D type="campaign" size={40} />
          Recent AI Campaigns
        </CardTitle>
      </CardHeader>
      <CardContent>
        {hasCampaigns ? (
          <Table>
            <TableHeader>
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead className="text-muted-foreground">Campaign Name</TableHead>
                <TableHead className="text-muted-foreground">Sent To</TableHead>
                <TableHead className="text-muted-foreground">Status</TableHead>
                <TableHead className="text-right text-muted-foreground">Sent</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((campaign) => (
                <TableRow key={campaign.id} className="border-border/50">
                  <TableCell className="font-medium text-foreground">
                    <div className="flex items-center gap-2">
                      {campaign.name}
                      {(campaign.status === "sending" || campaign.status === "active") && (
                        <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20">
                          Active
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{campaign.recipients_count?.toLocaleString() || 0} Users</TableCell>
                  <TableCell>
                    <Badge 
                      variant="secondary" 
                      className={
                        campaign.status === "completed" 
                          ? "bg-emerald-500/10 text-emerald-400"
                          : campaign.status === "sending"
                          ? "bg-amber-500/10 text-amber-400"
                          : "bg-zinc-500/10 text-zinc-400"
                      }
                    >
                      {campaign.status || "draft"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="text-emerald-400">{campaign.sent_count?.toLocaleString() || 0}</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
              <MessageSquare className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium text-foreground mb-1">No campaigns yet</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-xs">
              Create your first AI marketing campaign to engage customers via WhatsApp
            </p>
            <Button asChild size="sm" className="gap-2">
              <Link href="/admin/ai">
                <Sparkles className="w-4 h-4" />
                Create Campaign
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
