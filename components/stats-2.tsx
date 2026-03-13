"use client"

const stats = [
  { value: 50000, label: "Active Users" },
  { value: 1200000, label: "Revenue in 2023", prefix: "$" },
  { value: 1500000, label: "API Requests" },
  { value: 45, label: "Supported Countries" },
  { value: 99.9, label: "Uptime", suffix: "%" },
  { value: 24, label: "Support Hours", suffix: "/7" },
]

const formatValue = (value: number) => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
  return value.toString()
}

export function StatsSection() {
  return (
    <section id="stats">
      <div className="container space-y-10 p-6 md:p-10">
        <div className="mx-auto flex flex-col items-center justify-center gap-5">
          <p className="text-muted-foreground font-mono text-sm font-medium">
            STATISTICS
          </p>
          <h4 className="mx-auto max-w-3xl text-center text-3xl font-semibold tracking-tighter text-balance md:text-4xl">
            Our AI SaaS by the Numbers
          </h4>
        </div>
        <div className="border-border bg-border mx-auto grid max-w-5xl grid-cols-2 gap-px overflow-hidden rounded-lg border lg:grid-cols-3">
          {stats.map((stat, index) => (
            <div key={index} className="bg-background p-5 text-center">
              <h3 className="text-primary font-mono text-3xl font-semibold tracking-tight sm:text-4xl">
                {`${stat.prefix ?? ""}${formatValue(stat.value)}${stat.suffix ?? ""}`}
              </h3>
              <p className="text-muted-foreground mt-1 text-sm">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
