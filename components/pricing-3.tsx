"use client"

import { useState } from "react"
import NumberFlow, { NumberFlowGroup } from "@number-flow/react"
import { Check } from "lucide-react"
import { motion } from "motion/react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface TabsListProps {
  children: React.ReactNode
}

interface TabsTriggerProps {
  onClick: () => void
  children: React.ReactNode
  isActive: boolean
}

type BillingCycle = "monthly" | "yearly"

type TopPricingPlan = {
  name: string
  monthlyPrice: number
  yearlyPrice: number
  description: string
  features: string[]
  ctaLabel: string
  extraBenefits?: string
  isPopular?: boolean
}

type EnterprisePlan = {
  name: string
  description: string
  features: string[]
}

const BILLING_CYCLES: BillingCycle[] = ["monthly", "yearly"]

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
      className={cn("relative z-1 cursor-pointer px-4 py-2", {
        "z-0": isActive,
      })}
    >
      {isActive && (
        <motion.div
          layoutId="active-tab"
          className="bg-primary absolute inset-0 rounded-full"
          transition={{
            duration: 0.2,
            type: "spring",
            stiffness: 300,
            damping: 25,
            velocity: 2,
          }}
        />
      )}
      <span
        className={cn(
          "relative block text-sm font-medium duration-200",
          isActive
            ? "text-primary-foreground delay-100"
            : "text-neutral-800 dark:text-white"
        )}
      >
        {children}
      </span>
    </button>
  )
}

const topPlans: TopPricingPlan[] = [
  {
    name: "Starter",
    monthlyPrice: 0,
    yearlyPrice: 0,
    description: "Best for trying MagicUI Pro and launching quickly.",
    features: [
      "Access to starter components and sections",
      "Community Discord support",
      "Use in 1 personal project",
    ],
    ctaLabel: "Start Free",
  },
  {
    name: "Creator",
    monthlyPrice: 19,
    yearlyPrice: 190,
    description: "Perfect for indie makers building polished product pages.",
    features: [
      "Everything in Starter",
      "Full premium block library",
      "Production-ready copy-paste code",
      "Unlimited personal projects",
      "Regular new block drops",
      "Email support",
    ],
    ctaLabel: "Choose Creator",
    extraBenefits: "Everything in Starter, plus:",
    isPopular: true,
  },
  {
    name: "Studio",
    monthlyPrice: 49,
    yearlyPrice: 490,
    description: "Built for teams shipping fast across multiple client apps.",
    features: [
      "Everything in Creator",
      "Up to 5 team members",
      "Use in unlimited commercial projects",
      "Figma-ready design references",
      "Priority support",
      "Early access to new releases",
    ],
    ctaLabel: "Choose Studio",
    extraBenefits: "Everything in Creator, plus:",
  },
]

const enterprisePlan: EnterprisePlan = {
  name: "Enterprise",
  description:
    "For organizations that need scalable UI workflows and dedicated support.",
  features: [
    "Unlimited seats",
    "Custom design system integration",
    "Private onboarding session",
    "Security and procurement support",
    "Dedicated success manager",
    "Custom invoicing and annual contracts",
    "SLA-backed support",
    "Roadmap collaboration",
  ],
}

function FeatureList({ items }: { items: string[] }) {
  return (
    <>
      {items.map((feature) => (
        <li key={feature} className="flex items-start gap-3 text-sm">
          <Check
            className="text-primary mt-1 size-3 shrink-0"
            strokeWidth={3}
            aria-hidden
          />
          <span className="text-foreground/90">{feature}</span>
        </li>
      ))}
    </>
  )
}

function PricingCard({
  plan,
  billingCycle,
}: {
  plan: TopPricingPlan
  billingCycle: BillingCycle
}) {
  const price = billingCycle === "yearly" ? plan.yearlyPrice : plan.monthlyPrice
  const intervalLabel = billingCycle === "yearly" ? "year" : "month"

  return (
    <div className="bg-card text-card-foreground border-border flex h-full flex-col rounded-xl border p-6">
      <div className="grid h-full grid-rows-[auto_auto_1fr] gap-6">
        <div className="flex min-h-20 flex-col gap-2">
          <p className="text-foreground text-lg font-semibold tracking-tight">
            {plan.name}
          </p>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {plan.description}
          </p>
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex items-baseline gap-1.5 text-3xl font-medium tabular-nums">
            <span className="min-w-0 overflow-hidden leading-none">
              <NumberFlow
                value={price}
                locales="en-US"
                format={{
                  style: "currency",
                  currency: "USD",
                  trailingZeroDisplay: "stripIfInteger",
                }}
              />
            </span>
            <span className="text-muted-foreground shrink-0 text-sm font-normal whitespace-nowrap">
              / {intervalLabel}
            </span>
          </div>
          <Button
            className="group w-full cursor-pointer overflow-hidden rounded-lg text-base tracking-tight shadow-none"
            variant={plan.isPopular ? "default" : "outline"}
          >
            {plan.ctaLabel}
          </Button>
        </div>
        <div className="flex flex-col gap-3">
          {plan.extraBenefits && (
            <p className="text-muted-foreground text-sm">
              {plan.extraBenefits}
            </p>
          )}
          <ul className="flex flex-col gap-2">
            <FeatureList items={plan.features} />
          </ul>
        </div>
      </div>
    </div>
  )
}

function EnterprisePricingCard({ plan }: { plan: EnterprisePlan }) {
  return (
    <div className="bg-card text-card-foreground border-border flex flex-col rounded-xl border md:col-span-3">
      <div className="grid w-full grid-cols-1 md:grid-cols-3">
        <div className="col-span-1 flex w-full flex-col items-start justify-start gap-2 p-6">
          <div className="flex flex-col gap-2">
            <p className="text-foreground text-xl font-semibold tracking-tight">
              {plan.name}
            </p>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {plan.description}
            </p>
          </div>
          <div className="mt-2 w-full">
            <Button
              className="w-fit cursor-pointer rounded-lg px-6 text-base tracking-tight shadow-none"
              variant="outline"
            >
              Book a Demo
            </Button>
          </div>
        </div>
        <div className="border-border col-span-1 border-t md:col-span-2 md:border-t-0 md:border-l">
          <ul className="grid grid-cols-1 gap-2 p-6 md:grid-cols-2 md:gap-x-6 md:gap-y-2">
            <FeatureList items={plan.features} />
          </ul>
        </div>
      </div>
    </div>
  )
}

export function Component() {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly")

  return (
    <section id="pricing">
      <div className="container mx-auto flex flex-col gap-8 p-6 md:p-10">
        <div className="mx-auto flex max-w-xl flex-col gap-4 text-center">
          <h2 className="text-foreground text-3xl font-medium tracking-tighter text-balance sm:text-4xl md:text-5xl">
            Simple pricing for <span className="text-primary">everyone</span>.
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
          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-4 md:grid-cols-3">
            {topPlans.map((plan) => (
              <PricingCard
                key={plan.name}
                plan={plan}
                billingCycle={billingCycle}
              />
            ))}

            <EnterprisePricingCard plan={enterprisePlan} />
          </div>
        </NumberFlowGroup>
      </div>
    </section>
  )
}
