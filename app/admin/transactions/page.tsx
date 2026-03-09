import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { History, Download, Filter, Coins } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PageHeader, T } from "@/components/admin/page-header";

export default async function TransactionsPage() {
  const supabase = await createClient();

  const { data: transactions } = await supabase
    .from("transactions")
    .select(
      `
      *,
      user:profiles!transactions_user_id_fkey(full_name, email),
      staff:profiles!transactions_staff_id_fkey(full_name, email)
    `
    )
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <PageHeader titleKey="transactions" descKey="transactionsDesc" />
        <div className="flex gap-3">
          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            <T k="filter" />
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            <T k="export" />
          </Button>
        </div>
      </div>

      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle><T k="allTransactions" /></CardTitle>
        </CardHeader>
        <CardContent>
          {transactions && transactions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground"><T k="time" /></th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground"><T k="memberCol" /></th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground"><T k="type" /></th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground"><T k="pointsCol" /></th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground"><T k="amountCol" /></th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground"><T k="reasonCol" /></th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground"><T k="operatorCol" /></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {transactions.map((tx: any) => (
                    <tr key={tx.id} className="hover:bg-muted/30">
                      <td className="py-4 px-4 text-sm text-muted-foreground">
                        {formatDate(tx.created_at)}
                      </td>
                      <td className="py-4 px-4">
                        <div>
                          <p className="font-medium">
                            {tx.user?.full_name || <T k="unknownUser" />}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {tx.user?.email}
                          </p>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${
                            tx.type === "earn"
                              ? "bg-green-500/20 text-green-500"
                              : tx.type === "redeem"
                              ? "bg-red-500/20 text-red-500"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          <Coins className="w-3 h-3" />
                          <T k={tx.type === "earn" ? "earn" : tx.type === "redeem" ? "redeem" : "adjust"} />
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`font-semibold ${
                            tx.type === "earn"
                              ? "text-green-500"
                              : tx.type === "redeem"
                              ? "text-red-500"
                              : "text-muted-foreground"
                          }`}
                        >
                          {tx.type === "earn" ? "+" : "-"}
                          {Math.abs(tx.points)}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        {tx.amount ? formatCurrency(tx.amount) : "-"}
                      </td>
                      <td className="py-4 px-4 text-sm text-muted-foreground">
                        {tx.reason || "-"}
                      </td>
                      <td className="py-4 px-4 text-sm text-muted-foreground">
                        {tx.staff?.full_name || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p><T k="noTransactions" /></p>
              <p className="text-sm mt-1"><T k="waitingFirstTransaction" /></p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
