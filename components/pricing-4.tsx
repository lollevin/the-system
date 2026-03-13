"use client"

import { CheckIcon } from "@radix-ui/react-icons"
import { ArrowRight } from "lucide-react"

import { Button } from "@/components/ui/button"

type PricingPlan = {
  title: string
  description: string
  price: string
  features: string[]
  popular: boolean
}

const pricingPlans: PricingPlan[] = [
  {
    title: "Starter",
    description: "Great for shipping your first polished UI pages.",
    price: "$9",
    features: [
      "Starter component access",
      "Single project usage",
      "Community support",
      "Starter updates",
    ],
    popular: false,
  },
  {
    title: "Pro",
    description: "Built for builders shipping production interfaces weekly.",
    price: "$29",
    features: [
      "Everything in Starter",
      "Full premium component library",
      "Unlimited project usage",
      "Commercial license",
      "Priority support",
    ],
    popular: true,
  },
  {
    title: "Enterprise",
    description: "For teams standardizing a shared design system.",
    price: "$99",
    features: [
      "Everything in Pro",
      "Team seats with shared access",
      "Design system onboarding",
      "Dedicated success support",
      "Centralized billing and invoicing",
    ],
    popular: false,
  },
]

function PlanCard({ plan }: { plan: PricingPlan }) {
  const cardClass = plan.popular
    ? "text-card-foreground flex flex-col gap-6 rounded-xl border border-primary border-2 bg-primary/5 py-8"
    : "text-card-foreground flex flex-col gap-6 rounded-xl border bg-card py-6"

  return (
    <div className={cardClass}>
      <div className="flex flex-col gap-1.5 px-6">
        <h3 className="leading-none font-semibold">{plan.title}</h3>
        <p className="text-muted-foreground text-sm">{plan.description}</p>
      </div>
      <div className="grow px-6">
        <div className="mb-4 flex items-baseline gap-2">
          <span className="text-3xl font-medium">{plan.price}</span>
          <span className="text-muted-foreground text-sm">/month</span>
        </div>
        <ul className="flex flex-col gap-2">
          {plan.features.map((feature) => (
            <li
              key={`${plan.title}-${feature}`}
              className="text-muted-foreground flex items-start gap-3 text-sm font-medium"
            >
              <CheckIcon className="bg-primary text-primary-foreground size-4 shrink-0 rounded-full stroke-[4px] p-[2px]" />
              <span className="flex">{feature}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-auto flex items-center px-6">
        <Button
          className="group hover:ring-primary w-full cursor-pointer overflow-hidden rounded-full text-base tracking-tight shadow-none transition-all duration-300 ease-out hover:ring-2 hover:ring-offset-2"
          variant={plan.popular ? "default" : "outline"}
        >
          Get Started
          <ArrowRight
            className="ml-2 size-4 transition-transform duration-300 group-hover:translate-x-0.5"
            aria-hidden
          />
        </Button>
      </div>
    </div>
  )
}

export function Component() {
  return (
    <section id="pricing">
      <div className="container mx-auto flex flex-col gap-8 p-6 md:p-10">
        <div className="mx-auto flex max-w-xl flex-col gap-4 text-center">
          <h2 className="text-foreground text-3xl font-semibold tracking-tighter text-balance sm:text-4xl md:text-5xl">
            Choose the perfect plan for your needs
          </h2>
        </div>
        <div className="mx-auto grid max-w-5xl items-end justify-center gap-4 overflow-visible lg:grid-cols-3">
          {pricingPlans.map((plan) => (
            <PlanCard key={plan.title} plan={plan} />
          ))}
        </div>
      </div>
    </section>
  )
}
