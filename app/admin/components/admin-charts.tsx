"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import type { Transaction } from "@/lib/supabase/types";

interface AdminChartsProps {
  transactions: Transaction[];
}

export default function AdminCharts({ transactions }: AdminChartsProps) {
  // Process data for daily visits chart
  const dailyData = transactions.reduce((acc, tx) => {
    const date = new Date(tx.created_at).toLocaleDateString("zh-CN", {
      month: "short",
      day: "numeric",
    });
    const existing = acc.find((d) => d.date === date);
    if (existing) {
      existing.visits += 1;
      existing.revenue += tx.amount || 0;
    } else {
      acc.push({
        date,
        visits: 1,
        revenue: tx.amount || 0,
      });
    }
    return acc;
  }, [] as { date: string; visits: number; revenue: number }[]);

  // Mock data if no real data
  const chartData =
    dailyData.length > 0
      ? dailyData.slice(-7)
      : [
          { date: "1月20日", visits: 45, revenue: 1200 },
          { date: "1月21日", visits: 52, revenue: 1450 },
          { date: "1月22日", visits: 38, revenue: 980 },
          { date: "1月23日", visits: 65, revenue: 1800 },
          { date: "1月24日", visits: 48, revenue: 1320 },
          { date: "1月25日", visits: 71, revenue: 2100 },
          { date: "1月26日", visits: 55, revenue: 1600 },
        ];

  // Pie chart data for customer segments
  const segmentData = [
    { name: "活跃会员", value: 45, color: "#22c55e" },
    { name: "普通会员", value: 30, color: "#f59e0b" },
    { name: "休眠会员", value: 25, color: "#ef4444" },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Daily Visits Bar Chart */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-lg">每日访问量</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis
                  dataKey="date"
                  stroke="#71717a"
                  fontSize={12}
                  tickLine={false}
                />
                <YAxis stroke="#71717a" fontSize={12} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#18181b",
                    border: "1px solid #27272a",
                    borderRadius: "8px",
                  }}
                  labelStyle={{ color: "#fff" }}
                />
                <Bar
                  dataKey="visits"
                  fill="#f59e0b"
                  radius={[4, 4, 0, 0]}
                  name="访问次数"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Revenue Line Chart */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-lg">收入趋势</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis
                  dataKey="date"
                  stroke="#71717a"
                  fontSize={12}
                  tickLine={false}
                />
                <YAxis stroke="#71717a" fontSize={12} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#18181b",
                    border: "1px solid #27272a",
                    borderRadius: "8px",
                  }}
                  labelStyle={{ color: "#fff" }}
                  formatter={(value: number) => [`RM ${value}`, "收入"]}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={{ fill: "#22c55e", strokeWidth: 2 }}
                  name="收入"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Customer Segments Pie Chart */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-lg">会员分布</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={segmentData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {segmentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#18181b",
                    border: "1px solid #27272a",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number) => [`${value}%`, "占比"]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-3 min-w-[120px]">
              {segmentData.map((segment) => (
                <div key={segment.name} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: segment.color }}
                  />
                  <span className="text-sm text-zinc-400">{segment.name}</span>
                  <span className="text-sm font-medium ml-auto">
                    {segment.value}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-lg">本周概览</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-zinc-800/50">
              <p className="text-3xl font-bold text-amber-500">
                {chartData.reduce((sum, d) => sum + d.visits, 0)}
              </p>
              <p className="text-sm text-zinc-400">总访问量</p>
            </div>
            <div className="p-4 rounded-lg bg-zinc-800/50">
              <p className="text-3xl font-bold text-green-500">
                RM {chartData.reduce((sum, d) => sum + d.revenue, 0).toLocaleString()}
              </p>
              <p className="text-sm text-zinc-400">总收入</p>
            </div>
            <div className="p-4 rounded-lg bg-zinc-800/50">
              <p className="text-3xl font-bold text-blue-500">
                {Math.round(
                  chartData.reduce((sum, d) => sum + d.visits, 0) /
                    chartData.length
                )}
              </p>
              <p className="text-sm text-zinc-400">日均访问</p>
            </div>
            <div className="p-4 rounded-lg bg-zinc-800/50">
              <p className="text-3xl font-bold text-purple-500">
                RM{" "}
                {Math.round(
                  chartData.reduce((sum, d) => sum + d.revenue, 0) /
                    chartData.length
                )}
              </p>
              <p className="text-sm text-zinc-400">日均收入</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
