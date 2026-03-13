"use client"

import { useState } from "react"
import NumberFlow, { NumberFlowGroup } from "@number-flow/react"
import { CheckIcon } from "@radix-ui/react-icons"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

type Interval = "month" | "year"
type PricePlan = {
  id: string
  name: string
  description: string
  features: string[]
  monthlyPrice: number
  yearlyPrice: number
  isMostPopular: boolean
}

const demoPrices: PricePlan[] = [
  {
    id: "price_1",
    name: "Basic",
    description: "Great for exploring the MagicUI Pro ecosystem.",
    features: [
      "Access to the starter component set",
      "Copy-paste code snippets",
      "Single project usage",
      "Community support",
    ],
    monthlyPrice: 1000,
    yearlyPrice: 10000,
    isMostPopular: false,
  },
  {
    id: "price_2",
    name: "Premium",
    description: "Best for developers shipping polished product UI fast.",
    features: [
      "Full premium component and block library",
      "Unlimited project usage",
      "Commercial license",
      "Priority support",
      "Monthly premium updates",
    ],
    monthlyPrice: 2000,
    yearlyPrice: 20000,
    isMostPopular: true,
  },
  {
    id: "price_5",
    name: "Enterprise",
    description: "For teams standardizing UI across products and clients.",
    features: [
      "Everything in Premium",
      "Team seats with shared access",
      "Design system onboarding",
      "Security documentation support",
      "Priority implementation support",
      "Centralized billing",
    ],
    monthlyPrice: 5000,
    yearlyPrice: 50000,
    isMostPopular: false,
  },
  {
    id: "price_6",
    name: "Ultimate",
    description: "A custom tier for high-scale product and agency teams.",
    features: [
      "Everything in Enterprise",
      "Dedicated success manager",
      "Roadmap collaboration",
      "Priority feature requests",
      "Custom contract terms",
      "Migration and rollout assistance",
    ],
    monthlyPrice: 8000,
    yearlyPrice: 80000,
    isMostPopular: false,
  },
]

export function Pricing() {
  const [interval, setInterval] = useState<Interval>("month")

  return (
    <section id="pricing">
      <div className="container mx-auto flex flex-col gap-8 p-6 md:p-10">
        <div className="mx-auto flex max-w-xl flex-col gap-4 text-center">
          <h2 className="text-foreground text-3xl font-semibold tracking-tighter text-balance sm:text-4xl md:text-5xl">
            Simple pricing for everyone
          </h2>
          <p className="text-muted-foreground text-balance">
            Choose an{" "}
            <strong className="text-foreground font-medium">
              affordable plan
            </strong>{" "}
            that&apos;s packed with the best features for engaging your
            audience, creating customer loyalty, and driving sales.
          </p>
        </div>

        <div className="flex w-full items-center justify-center space-x-2">
          <Switch
            id="interval"
            checked={interval === "year"}
            onCheckedChange={(checked) =>
              setInterval(checked ? "year" : "month")
            }
          />
          <Label htmlFor="interval">Annual</Label>
          <span className="bg-primary text-primary-foreground flex h-6 w-fit items-center justify-center rounded-lg px-2 font-mono text-xs leading-5 font-semibold tracking-wide whitespace-nowrap uppercase">
            2 MONTHS FREE
          </span>
        </div>

        <NumberFlowGroup>
          <div className="mx-auto grid w-full justify-center gap-4 md:grid-cols-2 lg:grid-cols-4">
            {demoPrices.map((price) => {
              const displayPrice =
                interval === "year"
                  ? price.yearlyPrice / 100
                  : price.monthlyPrice / 100

              return (
                <div
                  key={price.id}
                  className={cn(
                    "text-foreground relative grid h-full w-full grid-rows-[70px_auto_auto_1fr] gap-4 overflow-hidden rounded-lg border p-4",
                    {
                      "border-primary shadow-primary/20 border-2 shadow-[0_0_10px_0_rgba(0,0,0,0.1)]":
                        price.isMostPopular,
                    }
                  )}
                >
                  <div className="flex flex-col items-start tracking-tight">
                    <h2 className="text-lg font-semibold">{price.name}</h2>
                    <p className="text-muted-foreground text-sm">
                      {price.description}
                    </p>
                  </div>

                  <div className="flex items-baseline gap-1.5 text-4xl font-medium tabular-nums">
                    <span className="min-w-0 overflow-hidden leading-none">
                      <NumberFlow
                        value={displayPrice}
                        locales="en-US"
                        format={{
                          style: "currency",
                          currency: "USD",
                          trailingZeroDisplay: "stripIfInteger",
                        }}
                      />
                    </span>
                    <span className="text-muted-foreground shrink-0 text-sm font-medium whitespace-nowrap">
                      / {interval}
                    </span>
                  </div>

                  <Button
                    className={cn(
                      "group text-primary-foreground relative w-full gap-2 overflow-hidden rounded-lg text-lg font-semibold tracking-tighter",
                      "hover:ring-primary transform-gpu cursor-pointer ring-offset-current transition-all duration-300 ease-out hover:ring-2 hover:ring-offset-2"
                    )}
                  >
                    <span className="bg-primary absolute right-0 -mt-12 h-32 w-8 translate-x-12 rotate-12 transform-gpu opacity-10 transition-all duration-1000 ease-out group-hover:-translate-x-96" />
                    <p>Subscribe</p>
                  </Button>

                  <div className="flex h-full flex-col gap-3">
                    <hr className="m-0 h-px w-full border-none bg-linear-to-r from-neutral-200/0 via-neutral-500/30 to-neutral-200/0" />
                    <ul className="text-muted-foreground flex flex-col gap-2 font-normal">
                      {price.features.map((feature, idx) => (
                        <li
                          key={idx}
                          className="text-muted-foreground flex items-start gap-3 text-sm font-medium"
                        >
                          <CheckIcon className="bg-primary text-primary-foreground mt-0.5 size-4 shrink-0 rounded-full stroke-4" />
                          <span className="flex">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )
            })}
          </div>
        </NumberFlowGroup>
      </div>
    </section>
  )
}
