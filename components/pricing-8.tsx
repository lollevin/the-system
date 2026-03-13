"use client"

import { useEffect, useRef, useState } from "react"
import NumberFlow, { NumberFlowGroup } from "@number-flow/react"
import { CheckIcon } from "@radix-ui/react-icons"
import { motion } from "motion/react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface TabsProps {
  activeTab: string
  setActiveTab: (tab: "yearly" | "monthly") => void
  className?: string
  children: (activeTab: string) => React.ReactNode
}

interface TabsListProps {
  children: React.ReactNode
}

interface TabsTriggerProps {
  value: string
  onClick: () => void
  children: React.ReactNode
  isActive: boolean
}

const Tabs = ({ activeTab, setActiveTab, className, children }: TabsProps) => {
  return (
    <div
      className={cn(
        "mx-auto flex w-full items-center justify-center",
        className
      )}
    >
      {children(activeTab)}
    </div>
  )
}

const TabsList = ({ children }: TabsListProps) => {
  return (
    <div className="relative flex w-fit items-center rounded-full border p-1.5">
      {children}
    </div>
  )
}

const TabsTrigger = ({
  value,
  onClick,
  children,
  isActive,
}: TabsTriggerProps) => {
  return (
    <button
      onClick={onClick}
      className={cn("relative z-1 px-4 py-2", { "z-0": isActive })}
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

const tiers = [
  {
    name: "Basic",
    price: { monthly: 9, yearly: 99 },
    frequency: { monthly: "month", yearly: "year" },
    description: "Perfect for trying MagicUI Pro in smaller projects.",
    features: [
      "Starter component collection",
      "Single project usage",
      "Community support",
      "Starter updates",
    ],
  },
  {
    name: "Pro",
    price: { monthly: 29, yearly: 290 },
    frequency: { monthly: "month", yearly: "year" },
    description: "Ideal for teams shipping polished product UIs fast.",
    features: [
      "Everything in Basic",
      "Full premium component library",
      "Unlimited project usage",
      "Commercial license",
      "Priority support",
      "Monthly premium releases",
    ],
    popular: true,
  },
  {
    name: "Enterprise",
    price: { monthly: 999, yearly: 9990 },
    frequency: { monthly: "month", yearly: "year" },
    description: "Tailored for organizations with multi-team workflows.",
    features: [
      "Everything in Pro",
      "Team seats and role access",
      "Dedicated success manager",
      "Design system onboarding",
      "Security and procurement support",
      "Custom invoicing and contracts",
    ],
  },
]

function PricingTier({
  tier,
  billingCycle,
}: {
  tier: (typeof tiers)[0]
  billingCycle: "monthly" | "yearly"
}) {
  return (
    <div
      className={cn(
        "bg-background text-foreground relative z-10 box-border grid h-full w-full grid-rows-[auto_1fr_auto] overflow-hidden rounded-xl border",
        tier.popular && "border-primary"
      )}
    >
      <div className="border-border flex min-h-44 flex-col gap-2 border-b p-4">
        <div className="flex items-center justify-between leading-none font-semibold">
          {tier.name}
          {tier.popular && (
            <Badge
              variant="secondary"
              className="bg-primary text-primary-foreground"
            >
              Most Popular
            </Badge>
          )}
        </div>
        <div className="flex items-baseline gap-1.5 text-4xl font-medium tabular-nums">
          <span className="min-w-0 overflow-hidden leading-none">
            <NumberFlow
              value={tier.price[billingCycle] as number}
              locales="en-US"
              format={{
                style: "currency",
                currency: "USD",
                trailingZeroDisplay: "stripIfInteger",
              }}
            />
          </span>
          <span className="text-muted-foreground shrink-0 text-sm font-medium whitespace-nowrap">
            / {tier.frequency[billingCycle]}
          </span>
        </div>
        <p className="text-muted-foreground text-sm">{tier.description}</p>
      </div>
      <div className="flex min-h-0 flex-1 flex-col justify-start p-4">
        <ul className="flex flex-col gap-3">
          {tier.features.map((feature, featureIndex) => (
            <li
              key={featureIndex}
              className="text-muted-foreground flex items-start gap-3 text-sm"
            >
              <CheckIcon className="bg-primary text-primary-foreground mt-0.5 size-4 shrink-0 rounded-full stroke-[4px] p-[2px]" />
              <span className="flex">{feature}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="p-4">
        <Button
          variant={tier.popular ? "default" : "outline"}
          className="group hover:ring-primary mt-6 flex h-11 w-full min-w-0 cursor-pointer justify-center overflow-hidden rounded-full px-4 text-base tracking-tight transition-all duration-300 ease-out hover:ring-2 hover:ring-offset-2"
        >
          Join Now
        </Button>
      </div>
    </div>
  )
}

export function Pricing() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">(
    "yearly"
  )
  const [carouselIndex, setCarouselIndex] = useState(0)
  const carouselRef = useRef<HTMLDivElement>(null)

  const handleTabChange = (tab: "yearly" | "monthly") => {
    setBillingCycle(tab)
  }

  const scrollToIndex = (index: number) => {
    const container = carouselRef.current
    if (!container) return
    const cards = container.querySelectorAll("[data-carousel-card]")
    const card = cards[index] as HTMLElement
    if (card) {
      const scrollLeft =
        card.offsetLeft - (container.offsetWidth - card.offsetWidth) / 2
      container.scrollTo({
        left: Math.max(0, scrollLeft),
        behavior: "smooth",
      })
    }
  }

  useEffect(() => {
    const container = carouselRef.current
    if (!container) return

    const cards = container.querySelectorAll("[data-carousel-card]")
    if (cards.length === 0) return

    const updateActiveIndex = () => {
      const containerRect = container.getBoundingClientRect()
      const containerCenter = containerRect.left + containerRect.width / 2

      let closestIndex = 0
      let closestDist = Infinity
      cards.forEach((el, i) => {
        const card = el as HTMLElement
        const cardRect = card.getBoundingClientRect()
        const cardCenter = cardRect.left + cardRect.width / 2
        const dist = Math.abs(containerCenter - cardCenter)
        if (dist < closestDist) {
          closestDist = dist
          closestIndex = i
        }
      })
      setCarouselIndex(closestIndex)
    }

    container.addEventListener("scroll", updateActiveIndex, { passive: true })
    updateActiveIndex()

    const resizeObserver = new ResizeObserver(updateActiveIndex)
    resizeObserver.observe(container)

    return () => {
      container.removeEventListener("scroll", updateActiveIndex)
      resizeObserver.disconnect()
    }
  }, [])

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
          <Tabs
            activeTab={billingCycle}
            setActiveTab={handleTabChange}
            className="mx-auto w-full max-w-md"
          >
            {(activeTab) => (
              <TabsList>
                {["yearly", "monthly"].map((tab) => (
                  <TabsTrigger
                    key={tab}
                    value={tab}
                    onClick={() => handleTabChange(tab as "yearly" | "monthly")}
                    isActive={activeTab === tab}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </TabsTrigger>
                ))}
              </TabsList>
            )}
          </Tabs>
        </div>
        <NumberFlowGroup>
          <div className="relative">
            <div
              ref={carouselRef}
              className={cn(
                "-mx-4 flex snap-x snap-mandatory gap-6 overflow-x-auto scroll-smooth px-4 pt-4 pb-4 md:mx-0 md:grid md:snap-none md:grid-cols-2 md:items-stretch md:overflow-visible md:px-0 md:pt-0 md:pb-0 lg:grid-cols-3",
                "no-scrollbar"
              )}
            >
              {tiers.map((tier, index) => (
                <div
                  key={index}
                  data-carousel-card
                  className="w-[85vw] min-w-[280px] shrink-0 snap-center md:w-auto md:min-w-0 md:shrink"
                >
                  <PricingTier tier={tier} billingCycle={billingCycle} />
                </div>
              ))}
            </div>
            <div className="flex justify-center gap-2 pt-4 md:hidden">
              {tiers.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => scrollToIndex(index)}
                  className={cn(
                    "h-2 cursor-pointer rounded-full transition-all duration-200",
                    carouselIndex === index
                      ? "bg-primary w-6"
                      : "bg-muted-foreground/30 hover:bg-muted-foreground/50 w-2"
                  )}
                  aria-label={`Go to plan ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </NumberFlowGroup>
      </div>
    </section>
  )
}
