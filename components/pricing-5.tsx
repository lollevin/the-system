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

type PricingPlan = {
  name: string
  monthlyPrice: number
  yearlyPrice: number
  description: string
  features: string[]
  extraBenefits?: string
  isPopular?: boolean
}

const BILLING_CYCLE_OPTIONS: { value: BillingCycle; label: string }[] = [
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
]

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

const pricingPlans: PricingPlan[] = [
  {
    name: "Free",
    monthlyPrice: 0,
    yearlyPrice: 0,
    description: "For developers exploring MagicUI Pro for the first time.",
    features: [
      "Starter component collection",
      "Single project usage",
      "Community support",
    ],
  },
  {
    name: "Pro",
    monthlyPrice: 14,
    yearlyPrice: 140,
    description: "Ideal for shipping premium interfaces faster.",
    features: [
      "Everything in Free Plan",
      "Full premium component and block library",
      "Unlimited project usage",
      "Commercial license",
      "Monthly premium updates",
      "Email support",
      "Access to private changelog",
      "Early access to new drops",
      "Lifetime update access",
    ],
    extraBenefits: "Everything in Free Plan, plus:",
    isPopular: true,
  },
  {
    name: "Startup",
    monthlyPrice: 37,
    yearlyPrice: 370,
    description: "For teams that need collaboration and predictable delivery.",
    features: [
      "Everything in Pro Plan",
      "Up to 5 team seats",
      "Shared team access",
      "Design system guidance",
      "Priority support SLA",
      "Use across client projects",
      "Advanced template packs",
      "Quarterly implementation review",
      "Centralized billing",
    ],
    extraBenefits: "Everything in Pro Plan, plus:",
  },
]

function getPriceForCycle(plan: PricingPlan, billingCycle: BillingCycle) {
  return billingCycle === "yearly" ? plan.yearlyPrice : plan.monthlyPrice
}

function FeatureList({ intro, items }: { intro?: string; items: string[] }) {
  return (
    <ul className="space-y-3 text-sm">
      <li
        className={cn("font-medium", !intro && "invisible")}
        aria-hidden={!intro}
      >
        {intro ?? " "}
      </li>
      {items.map((feature) => (
        <li key={feature} className="flex items-center gap-2">
          <Check
            className="text-muted-foreground size-3 shrink-0"
            strokeWidth={3.5}
            aria-hidden
          />
          {feature}
        </li>
      ))}
    </ul>
  )
}

function BillingCycleTabs({
  billingCycle,
  onBillingCycleChange,
}: {
  billingCycle: BillingCycle
  onBillingCycleChange: (value: BillingCycle) => void
}) {
  return (
    <div className="flex items-center justify-center">
      <TabsList>
        {BILLING_CYCLE_OPTIONS.map((option) => (
          <TabsTrigger
            key={option.value}
            onClick={() => onBillingCycleChange(option.value)}
            isActive={billingCycle === option.value}
          >
            {option.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </div>
  )
}

function PricingPlanCard({
  plan,
  billingCycle,
  intervalLabel,
}: {
  plan: PricingPlan
  billingCycle: BillingCycle
  intervalLabel: "month" | "year"
}) {
  const currentPrice = getPriceForCycle(plan, billingCycle)

  return (
    <div
      className={cn(
        "text-card-foreground relative isolate grid grid-rows-[auto_auto_auto_1fr] gap-8 p-8",
        plan.isPopular &&
          "md:before:border-border md:before:bg-card md:before:pointer-events-none md:before:absolute md:before:inset-x-0 md:before:inset-y-2 md:before:-z-10 md:before:rounded-lg md:before:border md:before:content-['']"
      )}
    >
      <div className="self-end">
        <p className="text-foreground text-lg font-medium">{plan.name}</p>
        <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
          {plan.description}
        </p>
      </div>
      <div>
        <div className="text-3xl font-semibold tabular-nums">
          <NumberFlow
            value={currentPrice}
            locales="en-US"
            format={{
              style: "currency",
              currency: "USD",
              trailingZeroDisplay: "stripIfInteger",
            }}
          />
        </div>
        <div className="text-muted-foreground text-sm">Per {intervalLabel}</div>
      </div>
      <Button
        className={cn(
          "w-full cursor-pointer rounded-md",
          !plan.isPopular &&
            "bg-card ring-foreground/10 hover:bg-muted/50 border-transparent ring-1"
        )}
        variant={plan.isPopular ? "default" : "outline"}
      >
        Get Started
      </Button>
      <FeatureList intro={plan.extraBenefits} items={plan.features} />
    </div>
  )
}

export function Component() {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly")
  const intervalLabel: "month" | "year" =
    billingCycle === "yearly" ? "year" : "month"

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
        <BillingCycleTabs
          billingCycle={billingCycle}
          onBillingCycleChange={setBillingCycle}
        />
        <NumberFlowGroup>
          <div className="border-border relative mx-auto w-full max-w-6xl overflow-hidden rounded-xl border">
            <div className="divide-border grid grid-cols-1 divide-y md:grid-cols-3 md:divide-y-0">
              {pricingPlans.map((plan) => (
                <PricingPlanCard
                  key={plan.name}
                  plan={plan}
                  billingCycle={billingCycle}
                  intervalLabel={intervalLabel}
                />
              ))}
            </div>
          </div>
        </NumberFlowGroup>
      </div>
    </section>
  )
}
