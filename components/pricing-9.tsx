import { Check, X } from "lucide-react"

import { Button } from "@/components/ui/button"

type Plan = {
  name: string
  price: string
  description: string
  cta: string
  featured?: boolean
}

type ComparisonRow = {
  label: string
  values: [string | boolean, string | boolean, string | boolean]
}

const plans: Plan[] = [
  {
    name: "Basic",
    price: "$19/mo",
    description: "Perfect for individuals getting started with MagicUI Pro.",
    cta: "Get started",
  },
  {
    name: "Advanced",
    price: "$29/mo",
    description: "Built for growing teams shipping production UI.",
    cta: "Get started",
    featured: true,
  },
  {
    name: "Enterprise",
    price: "$99/mo",
    description: "For larger teams with shared workflows.",
    cta: "Contact sales",
  },
]

const comparisonRows: ComparisonRow[] = [
  { label: "Component blocks", values: ["40+", "120+", "Unlimited"] },
  { label: "Premium templates", values: ["2", "8", "All"] },
  { label: "Project usage", values: ["3", "Unlimited", "Unlimited"] },
  { label: "Commercial license", values: [false, true, true] },
  { label: "Team seats", values: ["1", "5", "Unlimited"] },
  { label: "Private changelog access", values: [false, true, true] },
  { label: "Early access releases", values: [false, true, true] },
  { label: "Priority support", values: [false, true, true] },
  { label: "Design system guidance", values: [false, false, true] },
  { label: "Security documentation", values: [false, false, true] },
  { label: "Custom invoicing", values: [false, false, true] },
  { label: "Dedicated success manager", values: [false, false, true] },
]

const desktopTopButtonClassName =
  "group hover:ring-primary mt-6 flex h-11 w-full min-w-0 cursor-pointer justify-center overflow-hidden rounded-full px-4 text-base tracking-tight transition-all duration-300 ease-out hover:ring-2 hover:ring-offset-2"

const mobileHeaderButtonClassName =
  "mt-2 h-6 w-fit cursor-pointer rounded-full px-2 text-sm md:hidden"

function renderCell(value: string | boolean) {
  if (typeof value === "string") {
    return <span className="text-sm font-semibold">{value}</span>
  }

  return value ? (
    <span className="bg-foreground/50 text-background flex size-4 items-center justify-center rounded-full">
      <Check className="size-3" aria-label="Included" />
    </span>
  ) : (
    <span className="bg-foreground/20 text-background flex size-4 items-center justify-center rounded-full">
      <X className="size-3" aria-label="Not included" />
    </span>
  )
}

export function Component() {
  return (
    <section id="pricing">
      <div className="container mx-auto w-full p-4">
        <div className="md:bg-background/95 hidden w-full grid-cols-1 gap-x-4 gap-y-8 py-10 md:sticky md:top-0 md:z-30 md:grid md:grid-cols-[minmax(220px,1fr)_repeat(3,minmax(0,1fr))] md:backdrop-blur">
          <div className="hidden md:block" />
          {plans.map((plan) => (
            <article
              key={plan.name}
              className="grid h-full min-w-0 grid-rows-[auto_auto_1fr_auto] gap-2 rounded-none"
            >
              <p className="text-sm font-medium">{plan.name}</p>
              <p className="text-4xl font-semibold tracking-tight">
                {plan.price}
              </p>
              <p className="text-muted-foreground text-sm">
                {plan.description}
              </p>
              <Button
                variant={plan.featured ? "default" : "outline"}
                className={desktopTopButtonClassName}
              >
                {plan.cta}
              </Button>
            </article>
          ))}
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[600px]">
            <div className="grid min-h-16 grid-cols-[minmax(160px,1fr)_repeat(3,minmax(160px,1fr))] items-stretch md:hidden">
              <div className="bg-background/85 sticky left-0 z-20 flex h-full w-full items-center px-4 py-3 backdrop-blur-md">
                <span className="text-sm font-medium">Feature</span>
              </div>
              {plans.map((plan) => (
                <div
                  key={plan.name}
                  className="flex h-full flex-col justify-between gap-3 px-4 py-3 text-left"
                >
                  <div className="space-y-1.5">
                    <p className="text-sm font-semibold">{plan.name}</p>
                    <p className="text-muted-foreground text-sm">
                      {plan.price}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {plan.description}
                    </p>
                  </div>
                  <div>
                    <Button
                      variant={plan.featured ? "default" : "outline"}
                      className={mobileHeaderButtonClassName}
                    >
                      {plan.cta}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            {comparisonRows.map((row, rowIndex) => {
              const rowBackgroundClassName =
                rowIndex % 2 === 0 ? "bg-muted/50" : "bg-background"
              return (
                <div
                  key={`${row.label}-${rowIndex}`}
                  className="grid min-h-12 grid-cols-[minmax(160px,1fr)_repeat(3,minmax(160px,1fr))] items-center md:grid-cols-[minmax(220px,1fr)_repeat(3,minmax(0,1fr))]"
                >
                  <p
                    className={`sticky left-0 z-10 px-4 py-3 text-sm font-medium whitespace-nowrap backdrop-blur-md ${
                      rowIndex % 2 === 0 ? "bg-muted/70" : "bg-background/85"
                    }`}
                  >
                    {row.label}
                  </p>
                  {row.values.map((value, valueIndex) => (
                    <div
                      key={`${row.label}-${valueIndex}`}
                      className={`px-4 py-3 text-left text-sm font-medium ${rowBackgroundClassName}`}
                    >
                      {renderCell(value)}
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
