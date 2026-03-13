"use client"

import React, { useMemo, useState } from "react"
import NumberFlow from "@number-flow/react"
import { CheckIcon } from "@radix-ui/react-icons"
import { ArrowRight } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"

type Feature = {
  text: string
  available: boolean
}

type Plan = {
  name: string
  priceValue?: number
  priceLabel?: string
  videoCount?: number
  videoCountLabel?: string
  preamble?: string
  features: Feature[]
  buttonText: string
  finePrint?: string
}

const VIDEO_TIERS = [0, 100, 200, 300, 500] as const

function getProPrice(videos: number): number {
  if (videos <= 100) return 49
  if (videos <= 200) return 79
  if (videos <= 300) return 99
  return 99
}

const PlanCard = React.memo(
  ({ plan, isRecommended }: { plan: Plan; isRecommended: boolean }) => (
    <div
      className={cn(
        "relative grid grid-rows-[1fr_auto_1fr_auto] gap-10 rounded-2xl border p-4 transition-all duration-300",
        isRecommended
          ? "border-primary/30 via-primary/5 to-primary/15 bg-linear-to-b from-transparent"
          : "border-border bg-background"
      )}
    >
      <div className="flex flex-col gap-10">
        <div className="relative flex flex-col items-center gap-2 text-center">
          <h3 className="text-lg font-semibold tracking-tighter">
            {plan.name}
          </h3>
          {isRecommended && (
            <span className="border-primary/30 bg-primary/5 text-primary absolute top-9 left-1/2 flex h-6 w-fit -translate-x-1/2 items-center justify-center rounded-md border px-2 text-xs">
              Recommended
            </span>
          )}
        </div>
        <div className="text-center">
          {plan.priceValue !== undefined ? (
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-4xl font-medium tracking-tighter">$</span>
              <NumberFlow
                value={plan.priceValue}
                className="text-4xl font-medium tabular-nums"
              />
              <span className="text-muted-foreground text-sm">/ mo</span>
            </div>
          ) : (
            <p className="text-4xl font-medium tracking-tighter">
              {plan.priceLabel}
            </p>
          )}
        </div>
      </div>

      <div>
        <hr className="m-0 h-px w-full border-none bg-linear-to-r from-neutral-200/0 via-neutral-500/30 to-neutral-200/0" />
        {plan.videoCount !== undefined ? (
          <div className="flex items-baseline justify-center gap-1 p-4">
            <NumberFlow
              value={plan.videoCount}
              className="text-lg font-medium"
            />
            <span className="text-lg font-medium">videos / mo</span>
          </div>
        ) : plan.videoCountLabel ? (
          <p className="p-4 text-center text-lg font-medium tracking-tight">
            {plan.videoCountLabel}
          </p>
        ) : (
          <div className="p-4" />
        )}
        <hr className="m-0 h-px w-full border-none bg-linear-to-r from-neutral-200/0 via-neutral-500/30 to-neutral-200/0" />
      </div>

      <div>
        {plan.preamble && (
          <p className="text-muted-foreground mb-4 text-sm">{plan.preamble}</p>
        )}
        <ul className="flex flex-col gap-3">
          {plan.features.map((feature, i) => (
            <li
              key={i}
              className="text-muted-foreground flex items-start gap-3 text-sm font-medium"
            >
              <CheckIcon className="bg-primary text-primary-foreground size-5 shrink-0 rounded-full p-[3px]" />
              <span className="flex">{feature.text}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex w-full flex-col gap-2">
        <Button
          className="group hover:ring-primary w-full cursor-pointer overflow-hidden rounded-lg text-base tracking-tight transition-all duration-300 ease-out hover:ring-2 hover:ring-offset-2"
          variant="default"
        >
          {plan.buttonText}
          <ArrowRight
            className="ml-2 size-4 transition-transform duration-300 group-hover:translate-x-0.5"
            aria-hidden
          />
        </Button>
        <div className="min-h-5">
          {plan.finePrint ? (
            <p className="text-muted-foreground text-center text-xs text-balance">
              {plan.finePrint}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
)

export function Pricing() {
  const [sliderIndex, setSliderIndex] = useState(1) // default 100 videos

  const videoCount = VIDEO_TIERS[sliderIndex]
  const isProRange = videoCount >= 100 && videoCount <= 300
  const isEnterpriseRange = videoCount >= 500

  const plans = useMemo((): Plan[] => {
    const freePlan: Plan = {
      name: "Free",
      priceValue: 0,
      videoCount: 0,
      features: [
        { text: "Starter component collection", available: true },
        { text: "Single project usage", available: true },
        { text: "Community support", available: true },
      ],
      buttonText: "Get Started",
    }

    const proVideoCount = Math.max(100, Math.min(videoCount, 300))
    const proPrice = getProPrice(proVideoCount)
    const proPlan: Plan = {
      name: "Pro",
      priceValue: proPrice,
      videoCount: proVideoCount,
      preamble: "Everything in Free plus:",
      features: [
        { text: "Full premium component library", available: true },
        { text: "Unlimited project usage", available: true },
        { text: "Priority email support", available: true },
      ],
      buttonText: "Get Started",
      finePrint: "30-day money back guarantee • Cancel anytime",
    }

    const enterprisePlan: Plan = {
      name: "Enterprise",
      priceLabel: "Custom",
      videoCountLabel: "A plan for your needs",
      features: [
        { text: "Custom commercial licensing", available: true },
        { text: "Dedicated support (Slack/Email)", available: true },
      ],
      buttonText: "Book a Call",
      finePrint: "30-day money back guarantee • Cancel anytime",
    }

    return [freePlan, proPlan, enterprisePlan]
  }, [videoCount])

  const recommendedIndex = isProRange ? 1 : isEnterpriseRange ? 2 : 0

  return (
    <section id="pricing">
      <div className="container mx-auto flex flex-col gap-8 p-6 md:p-10">
        <div className="mx-auto flex max-w-xl flex-col gap-4 text-center">
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

        <div className="flex flex-col gap-8">
          <div className="mx-auto w-full max-w-2xl">
            {/* Slider */}
            <div
              className={cn(
                "**:data-[slot=slider-track]:h-1.5 **:data-[slot=slider-track]:bg-neutral-200 **:data-[slot=slider-track]:dark:bg-neutral-700",
                "**:data-[slot=slider-range]:bg-neutral-900 **:data-[slot=slider-range]:dark:bg-neutral-300",
                "**:data-[slot=slider-thumb]:size-5 **:data-[slot=slider-thumb]:border-2 **:data-[slot=slider-thumb]:border-neutral-900 **:data-[slot=slider-thumb]:bg-white **:data-[slot=slider-thumb]:shadow-md **:data-[slot=slider-thumb]:dark:border-neutral-300 **:data-[slot=slider-thumb]:dark:bg-neutral-900"
              )}
            >
              <Slider
                min={0}
                max={VIDEO_TIERS.length - 1}
                step={1}
                value={[sliderIndex]}
                onValueChange={([v]) => setSliderIndex(v)}
                className="w-full"
              />
            </div>

            {/* Tick labels - positioned to match Radix thumb: (value-min)/(max-min)*100 */}
            <div className="relative mt-4 h-6 w-full">
              {VIDEO_TIERS.map((tier, i) => {
                const pct = (i / Math.max(1, VIDEO_TIERS.length - 1)) * 100
                return (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => setSliderIndex(i)}
                    className={cn(
                      "absolute -translate-x-1/2 text-sm transition-colors",
                      i === sliderIndex
                        ? "text-foreground font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    style={{ left: `${pct}%` }}
                  >
                    {tier.toLocaleString()}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Mobile: single card that changes based on slider */}
          <div className="md:hidden">
            <PlanCard plan={plans[recommendedIndex]} isRecommended />
          </div>

          {/* Desktop: 3-card grid */}
          <div className="mx-auto hidden max-w-5xl gap-6 md:grid md:grid-cols-3">
            {plans.map((plan, index) => (
              <PlanCard
                key={plan.name}
                plan={plan}
                isRecommended={index === recommendedIndex}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
