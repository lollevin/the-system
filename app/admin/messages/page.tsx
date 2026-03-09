import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { EventsPanel } from "@/components/admin/events-panel"
import { BulkWhatsApp } from "@/components/admin/bulk-whatsapp"
import { MessageSquare, Users, Calendar, History } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PageHeader, T } from "@/components/admin/page-header"

export default async function MessagesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!profile || profile.role !== "admin") {
    redirect("/")
  }

  // Get send history statistics
  const { count: totalSent } = await supabase
    .from("sent_messages")
    .select("*", { count: "exact", head: true })

  const { count: todaySent } = await supabase
    .from("sent_messages")
    .select("*", { count: "exact", head: true })
    .gte("created_at", new Date().toISOString().split("T")[0])

  // Get recent send records
  const { data: recentMessages } = await supabase
    .from("sent_messages")
    .select(`
      *,
      customer:customer_id(full_name, phone)
    `)
    .order("created_at", { ascending: false })
    .limit(10)

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <PageHeader titleKey="messageCenter" descKey="messageCenterDesc" />

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              <T k="todaySent" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todaySent || 0}</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              <T k="totalSentCount" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSent || 0}</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              <T k="sendMethod" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className="bg-green-500">WhatsApp</Badge>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="events" className="space-y-4">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="events" className="gap-2">
            <Calendar className="w-4 h-4" />
            <T k="todayEvents" />
          </TabsTrigger>
          <TabsTrigger value="bulk" className="gap-2">
            <Users className="w-4 h-4" />
            <T k="bulkSend" />
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="w-4 h-4" />
            <T k="sendHistory" />
          </TabsTrigger>
        </TabsList>

        {/* Today Events */}
        <TabsContent value="events">
          <EventsPanel />
        </TabsContent>

        {/* Bulk Send */}
        <TabsContent value="bulk">
          <BulkWhatsApp />
        </TabsContent>

        {/* Send History */}
        <TabsContent value="history">
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5 text-amber-500" />
                <T k="recentSendRecords" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentMessages && recentMessages.length > 0 ? (
                <div className="space-y-3">
                  {recentMessages.map((msg: any) => (
                    <div 
                      key={msg.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                    >
                      <div>
                        <p className="font-medium">
                          {msg.customer?.full_name || <T k="unknownCustomer" />}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {msg.customer?.phone || <T k="noPhone" />}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                          {msg.message_content?.slice(0, 50)}...
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="mb-1">
                          {msg.message_type}
                        </Badge>
                        <p className="text-xs text-muted-foreground">
                          {new Date(msg.created_at).toLocaleString("en-US")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p><T k="noSendRecords" /></p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
