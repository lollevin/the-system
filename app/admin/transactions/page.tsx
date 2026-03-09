import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { History, Download, Filter, Coins } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

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
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <History className="w-8 h-8 text-amber-500" />
            交易记录
          </h1>
          <p className="text-zinc-400 mt-1">查看所有积分交易历史</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            筛选
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            导出
          </Button>
        </div>
      </div>

      {/* Transactions Table */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle>所有交易</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions && transactions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left py-3 px-4 text-sm font-medium text-zinc-400">
                      时间
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-zinc-400">
                      会员
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-zinc-400">
                      类型
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-zinc-400">
                      积分
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-zinc-400">
                      金额
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-zinc-400">
                      原因
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-zinc-400">
                      操作员
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {transactions.map((tx: any) => (
                    <tr key={tx.id} className="hover:bg-zinc-800/50">
                      <td className="py-4 px-4 text-sm text-zinc-400">
                        {formatDate(tx.created_at)}
                      </td>
                      <td className="py-4 px-4">
                        <div>
                          <p className="font-medium">
                            {tx.user?.full_name || "未知用户"}
                          </p>
                          <p className="text-xs text-zinc-500">
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
                              : "bg-zinc-700 text-zinc-400"
                          }`}
                        >
                          <Coins className="w-3 h-3" />
                          {tx.type === "earn"
                            ? "获取"
                            : tx.type === "redeem"
                            ? "兑换"
                            : "调整"}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`font-semibold ${
                            tx.type === "earn"
                              ? "text-green-500"
                              : tx.type === "redeem"
                              ? "text-red-500"
                              : "text-zinc-400"
                          }`}
                        >
                          {tx.type === "earn" ? "+" : "-"}
                          {Math.abs(tx.points)}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        {tx.amount ? formatCurrency(tx.amount) : "-"}
                      </td>
                      <td className="py-4 px-4 text-sm text-zinc-400">
                        {tx.reason || "-"}
                      </td>
                      <td className="py-4 px-4 text-sm text-zinc-400">
                        {tx.staff?.full_name || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-zinc-500">
              <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>暂无交易记录</p>
              <p className="text-sm mt-1">等待第一笔交易</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
