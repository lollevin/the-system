import { ArrowRight } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export function CallToAction() {
  return (
    <section id="cta">
      <div className="bg-muted container mx-auto w-full p-4 md:p-10">
        <div className="flex items-center justify-center">
          <div className="group bg-background text-muted-foreground inline-flex items-center gap-2 rounded-full border p-1 pr-3 text-xs">
            <Badge
              variant="secondary"
              className="bg-primary text-primary-foreground rounded-full border shadow"
            >
              New
            </Badge>
            <span className="text-xs font-medium">Get started today</span>
            <ArrowRight
              className="size-3 transition-all duration-300 ease-out group-hover:translate-x-1"
              aria-hidden="true"
            />
          </div>
        </div>
        <div className="mt-4 flex flex-col items-center justify-center gap-6">
          <div className="mx-auto flex max-w-xl flex-col items-center justify-center gap-2">
            <h3 className="text-center text-2xl font-medium tracking-tight text-balance sm:text-4xl">
              Get started with MagicUI
            </h3>
            <p className="text-muted-foreground text-center text-base text-balance md:text-lg">
              Build a fast and animated marketing website with that converts
              visitors into customers.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              size="lg"
              className="hover:ring-primary transform-gpu cursor-pointer overflow-hidden rounded-full text-base tracking-tighter whitespace-pre transition-all duration-300 ease-out hover:ring-2 hover:ring-offset-2"
            >
              Get started
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="hover:ring-primary transform-gpu cursor-pointer overflow-hidden rounded-full text-base tracking-tighter whitespace-pre transition-all duration-300 ease-out hover:ring-2 hover:ring-offset-2"
            >
              Learn more
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
