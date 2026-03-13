"use client"

import { useState } from "react"
import NumberFlow, { NumberFlowGroup } from "@number-flow/react"
import { ArrowRight, Check } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

const pricingPlans = [
  {
    name: "Freelancer",
    monthlyPrice: 24,
    yearlyPrice: 240,
    description: "The essentials to ship polished pages with MagicUI Pro.",
    features: [
      "Starter premium components",
      "Use in up to 3 projects",
      "Community support",
      "Monthly updates",
    ],
  },
  {
    name: "Startup",
    monthlyPrice: 32,
    yearlyPrice: 320,
    description: "A plan that scales with your product and client work.",
    features: [
      "Everything in Freelancer",
      "Full premium block library",
      "Unlimited project usage",
      "Commercial license",
      "Priority support",
    ],
    popular: true,
  },
  {
    name: "Enterprise",
    monthlyPrice: 48,
    yearlyPrice: 480,
    description: "Dedicated support and onboarding for larger teams.",
    features: [
      "Everything in Startup",
      "Team seats and shared access",
      "Design system onboarding",
      "Dedicated success support",
    ],
  },
]

export function Component() {
  const [yearly, setYearly] = useState(false)

  return (
    <section id="pricing">
      <div className="container mx-auto flex flex-col gap-8 p-6 md:p-10">
        <div className="mx-auto flex max-w-3xl flex-col gap-4 text-center">
          <h2 className="text-foreground text-3xl font-semibold tracking-tighter text-balance sm:text-4xl md:text-5xl">
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

        <div className="flex items-center justify-center gap-2">
          <Label htmlFor="billing" className="text-sm font-medium">
            Monthly
          </Label>
          <Switch id="billing" checked={yearly} onCheckedChange={setYearly} />
          <Label htmlFor="billing" className="text-sm font-medium">
            Yearly
          </Label>
        </div>

        <NumberFlowGroup>
          <div className="border-border grid grid-rows-1 overflow-hidden border md:grid-cols-3">
            {pricingPlans.map((plan, index) => (
              <div
                key={index}
                className="group before:bg-border after:bg-border relative flex min-h-full flex-col justify-between before:absolute before:-top-px before:-left-px before:z-10 before:h-screen before:w-px before:content-[''] after:absolute after:-top-px after:-left-px after:z-0 after:h-px after:w-screen after:content-['']"
              >
                <div>
                  {plan.popular && (
                    <div className="bg-primary text-primary-foreground absolute top-3 right-3 px-2 py-1 text-xs font-semibold">
                      Most popular
                    </div>
                  )}
                  <div className="flex flex-col gap-2 px-6 py-4">
                    <h3 className="text-xl font-semibold">{plan.name}</h3>
                    <p className="text-muted-foreground text-sm">
                      {plan.description}
                    </p>
                    <div className="flex items-baseline gap-1.5 text-3xl font-semibold tabular-nums">
                      <span className="min-w-0 overflow-hidden leading-none">
                        <NumberFlow
                          value={yearly ? plan.yearlyPrice : plan.monthlyPrice}
                          locales="en-US"
                          format={{
                            style: "currency",
                            currency: "USD",
                            trailingZeroDisplay: "stripIfInteger",
                          }}
                        />
                      </span>
                      <span className="text-muted-foreground shrink-0 text-sm font-normal whitespace-nowrap">
                        / {yearly ? "year" : "month"}
                      </span>
                    </div>
                  </div>

                  <ul className="text-muted-foreground flex flex-col gap-2 px-6 py-4">
                    {plan.features.map((feature, featureIndex) => (
                      <li
                        key={featureIndex}
                        className="flex items-center text-sm"
                      >
                        <Check
                          className="text-primary mr-2 size-5 shrink-0"
                          strokeWidth={2}
                        />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
                <Button
                  className="group mt-auto w-full cursor-pointer overflow-hidden rounded-none border-t border-r-0 border-b-0 border-l-0 text-base tracking-tight shadow-none transition-all duration-300 ease-out"
                  variant={plan.popular ? "default" : "outline"}
                >
                  Buy plan
                  <ArrowRight
                    className="ml-2 size-4 transition-transform duration-300 group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </Button>
              </div>
            ))}
          </div>
        </NumberFlowGroup>
      </div>
    </section>
  )
}
