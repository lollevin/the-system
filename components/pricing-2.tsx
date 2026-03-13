"use client"

import { useState } from "react"
import NumberFlow, { NumberFlowGroup } from "@number-flow/react"
import { ArrowRight, Check } from "lucide-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

type BillingCycle = "monthly" | "yearly"

interface TabsListProps {
  children: React.ReactNode
}

interface TabsTriggerProps {
  onClick: () => void
  children: React.ReactNode
  isActive: boolean
}

const TabsList = ({ children }: TabsListProps) => {
  return (
    <div className="relative flex w-fit items-center rounded-full border p-1.5">
      {children}
    </div>
  )
}

const TabsTrigger = ({ onClick, children, isActive }: TabsTriggerProps) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "cursor-pointer rounded-full px-4 py-2 text-sm font-medium",
        isActive
          ? "bg-primary text-primary-foreground"
          : "text-neutral-800 dark:text-white"
      )}
    >
      {children}
    </button>
  )
}

type PricingOption = {
  name: string
  price: number
  yearlyPrice: number
  description: string
  features: string[]
  extraBenefits?: string
  isPopular?: boolean
}

const BILLING_CYCLES: BillingCycle[] = ["monthly", "yearly"]

const pricingOptions: PricingOption[] = [
  {
    name: "Free",
    price: 0,
    yearlyPrice: 0,
    description: "Try MagicUI Pro with a lightweight starter setup.",
    features: [
      "Starter component collection",
      "Single project usage",
      "Community support",
      "Starter updates",
    ],
  },
  {
    name: "Pro",
    price: 499,
    yearlyPrice: 1228,
    description: "Unlock the full MagicUI Pro library for production apps.",
    features: [
      "Everything in Free",
      "All premium components and blocks",
      "Unlimited project usage",
      "Commercial license",
      "Priority support",
    ],
    extraBenefits: "Everything in Free plan, plus:",
    isPopular: true,
  },
]

export function Component() {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly")

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
        <div className="flex items-center justify-center">
          <TabsList>
            {BILLING_CYCLES.map((tab) => (
              <TabsTrigger
                key={tab}
                onClick={() => setBillingCycle(tab)}
                isActive={billingCycle === tab}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        <NumberFlowGroup>
          <div className="mx-auto grid max-w-3xl gap-6 lg:grid-cols-2">
            {pricingOptions.map((option) => {
              const currentPrice =
                billingCycle === "yearly" ? option.yearlyPrice : option.price
              const intervalLabel = billingCycle === "yearly" ? "year" : "month"

              return (
                <div
                  key={option.name}
                  className="bg-card text-card-foreground border-border flex flex-col gap-6 rounded-xl border px-6 py-6"
                >
                  <div className="flex flex-col gap-3">
                    <Badge
                      variant="secondary"
                      className={cn(
                        "w-fit font-medium",
                        option.isPopular && "bg-primary text-primary-foreground"
                      )}
                    >
                      {option.name}
                    </Badge>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {option.description}
                    </p>
                  </div>
                  <div className="flex grow flex-col gap-6">
                    <div className="flex items-baseline gap-1.5 text-3xl font-medium tabular-nums">
                      <span className="min-w-0 overflow-hidden leading-none">
                        <NumberFlow
                          value={currentPrice}
                          locales="en-US"
                          format={{
                            style: "currency",
                            currency: "USD",
                            trailingZeroDisplay: "stripIfInteger",
                          }}
                        />
                      </span>
                      <span className="text-muted-foreground shrink-0 text-sm font-medium whitespace-nowrap">
                        / {intervalLabel}
                      </span>
                    </div>
                    <div className="via-border h-px w-full bg-linear-to-r from-transparent to-transparent" />
                    <div className="flex flex-col gap-3">
                      {option.extraBenefits && (
                        <p className="text-muted-foreground text-sm">
                          {option.extraBenefits}
                        </p>
                      )}
                      <ul className="flex flex-col gap-3">
                        {option.features.map((feature, featureIndex) => (
                          <li
                            key={featureIndex}
                            className="flex items-start gap-3 text-sm"
                          >
                            <Check
                              className="text-primary mt-0.5 size-4 shrink-0"
                              aria-hidden
                            />
                            <span className="text-foreground/90">
                              {feature}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="flex items-center pt-4">
                    <Button
                      className="group w-full cursor-pointer overflow-hidden rounded-full text-base tracking-tight"
                      variant={option.isPopular ? "default" : "outline"}
                    >
                      Choose Plan
                      <ArrowRight className="ml-2 size-4" aria-hidden />
                    </Button>
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
