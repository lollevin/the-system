"use client"

import {
  useRef,
  type KeyboardEvent,
  type ReactNode,
  type WheelEvent,
} from "react"
import { StarFilledIcon } from "@radix-ui/react-icons"

import { cn } from "@/lib/utils"

export const Highlight = ({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) => {
  return (
    <span className={cn("text-primary font-medium", className)}>
      {children}
    </span>
  )
}

export interface TestimonialCardProps {
  name: string
  role: string
  description: ReactNode
  className?: string
}

export const TestimonialCard = ({
  description,
  name,
  role,
  className,
}: TestimonialCardProps) => {
  return (
    <article
      aria-label={`Testimonial from ${name}`}
      className={cn(
        "bg-card border-border hover:ring-border flex h-full w-full cursor-pointer flex-col justify-between rounded-2xl border p-5 shadow-[0px_0px_10px_1px_rgba(0,0,0,0.04)] transition-all duration-300 hover:ring-1 hover:ring-inset",
        className
      )}
    >
      <div className="text-muted-foreground text-base leading-relaxed font-[450]">
        {description}
      </div>

      <div className="mt-6">
        <p className="sr-only">Rated 5 out of 5 stars</p>
        <div aria-hidden="true" className="flex gap-0.5 py-1">
          <StarFilledIcon className="text-primary size-4" />
          <StarFilledIcon className="text-primary size-4" />
          <StarFilledIcon className="text-primary size-4" />
          <StarFilledIcon className="text-primary size-4" />
          <StarFilledIcon className="text-primary size-4" />
        </div>
        <p className="text-foreground mt-1 font-medium">{name}</p>
        <p className="text-muted-foreground text-sm font-normal">{role}</p>
      </div>
    </article>
  )
}

const testimonials = [
  {
    name: "Alex Rivera",
    role: "CTO at InnovateTech",
    description: (
      <p>
        The AI-driven analytics from #QuantumInsights have revolutionized our
        product development cycle.{" "}
        <Highlight>
          Insights are now more accurate and faster than ever.
        </Highlight>{" "}
        A game-changer for tech companies.
      </p>
    ),
  },
  {
    name: "Samantha Lee",
    role: "Marketing Director at NextGen Solutions",
    description: (
      <p>
        Implementing #AIStream's customer prediction model has drastically
        improved our targeting strategy.{" "}
        <Highlight>Seeing a 50% increase in conversion rates!</Highlight> Highly
        recommend their solutions.
      </p>
    ),
  },
  {
    name: "Raj Patel",
    role: "Founder & CEO at StartUp Grid",
    description: (
      <p>
        As a startup, we need to move fast and stay ahead. #CodeAI's automated
        coding assistant helps us do just that.{" "}
        <Highlight>Our development speed has doubled.</Highlight> Essential tool
        for any startup.
      </p>
    ),
  },
  {
    name: "Emily Chen",
    role: "Product Manager at Digital Wave",
    description: (
      <p>
        #VoiceGen's AI-driven voice synthesis has made creating global products
        a breeze.{" "}
        <Highlight>Localization is now seamless and efficient.</Highlight> A
        must-have for global product teams.
      </p>
    ),
  },
  {
    name: "Michael Brown",
    role: "Data Scientist at FinTech Innovations",
    description: (
      <p>
        Leveraging #DataCrunch's AI for our financial models has given us an
        edge in predictive accuracy.{" "}
        <Highlight>
          Our investment strategies are now powered by real-time data analytics.
        </Highlight>{" "}
        Transformative for the finance industry.
      </p>
    ),
  },
] as const

const SCROLL_AMOUNT = 320

export function SocialProofTestimonials() {
  const listRef = useRef<HTMLUListElement>(null)

  const scrollHorizontally = (left: number) => {
    listRef.current?.scrollBy({
      left,
      behavior: "smooth",
    })
  }

  const handleWheel = (event: WheelEvent<HTMLUListElement>) => {
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) {
      return
    }

    event.preventDefault()
    scrollHorizontally(event.deltaY)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    if (event.key === "ArrowRight") {
      event.preventDefault()
      scrollHorizontally(SCROLL_AMOUNT)
      return
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault()
      scrollHorizontally(-SCROLL_AMOUNT)
    }
  }

  return (
    <section aria-labelledby="testimonials-heading" id="testimonials">
      <div className="p-6 md:p-10">
        <div className="relative">
          <ul
            aria-label="Customer testimonials"
            className="flex snap-x snap-mandatory scroll-px-[calc(50%-9rem)] gap-4 overflow-x-auto scroll-smooth px-[calc(50%-9rem)] pb-4 [-ms-overflow-style:none] [scrollbar-width:none] md:scroll-px-[calc(50%-12rem)] md:gap-6 md:px-[calc(50%-12rem)] [&::-webkit-scrollbar]:hidden"
            onKeyDown={handleKeyDown}
            onWheel={handleWheel}
            ref={listRef}
            tabIndex={0}
          >
            {testimonials.map((testimonial) => (
              <li
                className="w-72 shrink-0 snap-center list-none md:w-96"
                key={testimonial.name}
              >
                <TestimonialCard
                  description={testimonial.description}
                  name={testimonial.name}
                  role={testimonial.role}
                />
              </li>
            ))}
          </ul>
          <div
            aria-hidden="true"
            className="from-background pointer-events-none absolute inset-y-0 left-0 w-8 bg-linear-to-r to-transparent md:w-14"
          />
          <div
            aria-hidden="true"
            className="from-background pointer-events-none absolute inset-y-0 right-0 w-8 bg-linear-to-l to-transparent md:w-14"
          />
        </div>
      </div>
    </section>
  )
}
