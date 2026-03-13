"use client"

import {
  Label,
  Pie,
  PieChart,
  PolarGrid,
  PolarRadiusAxis,
  RadialBar,
  RadialBarChart,
} from "recharts"

import { Card, CardContent, CardFooter } from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

const chartData = [
  { browser: "safari", visitors: 1260, fill: "var(--color-safari)" },
]

const chartConfig = {
  visitors: {
    label: "Visitors",
  },
  safari: {
    label: "Safari",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

export function RadialCharts() {
  return (
    <Card className="border-none shadow-none">
      <CardContent className="flex items-center">
        <div>
          <ChartContainer
            config={chartConfig}
            className="mx-auto aspect-square h-[110px] w-[100px]"
          >
            <RadialBarChart
              data={chartData}
              startAngle={-190}
              endAngle={70}
              innerRadius={34}
              outerRadius={50}
            >
              <PolarGrid
                gridType="circle"
                radialLines={false}
                stroke="none"
                className="first:fill-muted last:fill-background"
                polarRadius={[37, 30]}
              />
              <RadialBar dataKey="visitors" background cornerRadius={20} />
              <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
                <Label
                  content={({ viewBox }) => {
                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                      return (
                        <text
                          x={viewBox.cx}
                          y={viewBox.cy}
                          textAnchor="middle"
                          dominantBaseline="middle"
                        ></text>
                      )
                    }
                  }}
                />
              </PolarRadiusAxis>
            </RadialBarChart>
          </ChartContainer>
        </div>
        <div className="ml-5">
          <h2 className="text-xl font-semibold">Title</h2>
          <p>Effective marketing and advertising materials.</p>
        </div>
      </CardContent>
    </Card>
  )
}

const roundChartData = [
  { browser: "chrome", visitors: 187, fill: "var(--color-chrome)" },
  { browser: "safari", visitors: 110, fill: "var(--color-safari)" },
  { browser: "firefox", visitors: 165, fill: "var(--color-firefox)" },
  { browser: "edge", visitors: 173, fill: "var(--color-edge)" },
]

const roundChartConfig = {
  visitors: {
    label: "Visitors",
  },
  chrome: {
    label: "Chrome",
    color: "var(--chart-1)",
  },
  safari: {
    label: "Safari",
    color: "var(--chart-2)",
  },
  firefox: {
    label: "Firefox",
    color: "var(--chart-3)",
  },
  edge: {
    label: "Edge",
    color: "var(--chart-4)",
  },
} satisfies ChartConfig

export function RoundChart() {
  return (
    <Card className="flex flex-col border-none shadow-none">
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={roundChartConfig}
          className="mx-auto aspect-square max-h-[250px]"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Pie data={roundChartData} dataKey="visitors" nameKey="browser" />
          </PieChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm">
        <div className="text-muted-foreground text-center leading-2">
          Effective marketing and advertising materials. It is also a great
          tool.
        </div>
      </CardFooter>
    </Card>
  )
}

export function ChartSection() {
  return (
    <section id="charts">
      <div className="container mx-auto flex max-w-6xl flex-col items-center py-16">
        <div className="mx-auto space-y-4 py-6 text-center">
          <h2 className="text-primary font-mono text-[14px] font-medium tracking-tight">
            Features
          </h2>
          <h4 className="mx-auto mb-2 max-w-3xl text-[42px] font-medium tracking-tighter text-balance">
            Our Approach to UX Design
          </h4>
        </div>
        <div className="grid items-center gap-10 sm:grid-cols-12">
          <div className="col-span-2 sm:col-span-4">
            <RoundChart />
          </div>
          <div className="col-span-2 sm:col-span-8">
            <div className="grid md:grid-cols-2">
              <RadialCharts />
              <RadialCharts />
              <RadialCharts />
              <RadialCharts />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
