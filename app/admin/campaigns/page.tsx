import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Play, Pause, MoreHorizontal, Megaphone } from "lucide-react";
import Link from "next/link";
import { PageHeader, T } from "@/components/admin/page-header";

export default async function CampaignsPage() {
  const supabase = await createClient();

  const { data: campaigns } = await supabase
    .from("ai_campaigns")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader titleKey="campaigns" descKey="manageCampaignsDesc" />
        <Link href="/admin/ai">
          <Button className="gap-2 bg-[#A17755] hover:bg-[#8A6548] text-white">
            <Plus className="h-4 w-4" />
            <T k="newCampaign" />
          </Button>
        </Link>
      </div>

      {campaigns && campaigns.length > 0 ? (
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
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Audience</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Recipients</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Sent</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Created</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((campaign) => (
                    <tr key={campaign.id} className="border-b border-border/30 hover:bg-muted/30">
                      <td className="px-4 py-4 text-sm font-medium text-foreground">{campaign.name}</td>
                      <td className="px-4 py-4">
                        <Badge 
                          variant="secondary"
                          className={
                            campaign.status === "sent" 
                              ? "bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30" 
                              : campaign.status === "sending"
                              ? "bg-amber-500/20 text-amber-500 hover:bg-amber-500/30"
                              : campaign.status === "draft"
                              ? "bg-muted text-muted-foreground"
                              : "bg-blue-500/20 text-blue-500"
                          }
                        >
                          {campaign.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 text-sm text-muted-foreground">{campaign.target_segment || "All"}</td>
                      <td className="px-4 py-4 text-sm text-foreground">{campaign.recipients_count?.toLocaleString() || 0}</td>
                      <td className="px-4 py-4 text-sm text-foreground">{campaign.sent_count?.toLocaleString() || 0}</td>
                      <td className="px-4 py-4 text-sm text-muted-foreground">
                        {new Date(campaign.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            {campaign.status === "sending" ? (
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
      ) : (
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="py-12 text-center">
            <Megaphone className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground"><T k="noCampaignsYet" /></p>
            <p className="text-sm text-muted-foreground mt-1">
              <T k="createFirstAiCampaign" />
            </p>
            <Link href="/admin/ai">
              <Button className="mt-4 gap-2 bg-[#A17755] hover:bg-[#8A6548] text-white">
                <Plus className="h-4 w-4" />
                <T k="createCampaign" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
