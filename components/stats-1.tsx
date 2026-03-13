import { Card, CardContent } from "@/components/ui/card"

const stats = [
  { value: "10K+", label: "Active Users" },
  { value: "500+", label: "Enterprise Clients" },
  { value: "99.9%", label: "Uptime" },
  { value: "24/7", label: "Support" },
]

export function Component() {
  return (
    <section id="stats">
      <div className="container space-y-10 p-6 md:p-10">
        <div className="mx-auto flex flex-col items-center justify-center gap-5">
          <p className="text-muted-foreground font-mono text-sm font-medium">
            Our Achievements
          </p>
          <h4 className="text-foreground mx-auto max-w-3xl text-center text-3xl font-semibold tracking-tighter text-balance md:text-4xl">
            Powering innovation worldwide
          </h4>
        </div>
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-2 md:gap-8 lg:grid-cols-4">
          {stats.map((stat, index) => (
            <Card key={index} className="border-none shadow-none">
              <CardContent className="p-0">
                <div className="flex flex-col items-center justify-center text-center">
                  <span className="text-primary font-mono text-3xl font-semibold tracking-tight sm:text-4xl">
                    {stat.value}
                  </span>
                  <span className="text-muted-foreground mt-1 text-sm">
                    {stat.label}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
