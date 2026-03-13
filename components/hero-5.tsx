import { Button } from "@/components/ui/button"

const title = "Magic UI Design Studio"
const description =
  "Build a fast and animated marketing website with that converts visitors into customers."
const primaryCta = "Start free trial"
const secondaryCta = "See a demo"

export function Component() {
  return (
    <section id="hero">
      <div className="container mx-auto px-4 py-20 md:p-10 md:py-20">
        <div className="mx-auto flex max-w-3xl flex-col items-center justify-center gap-5 text-center">
          <div className="mx-auto space-y-3 lg:mx-0">
            <h1 className="text-2xl font-medium tracking-tight text-balance sm:text-4xl lg:text-5xl">
              {title}
            </h1>
            <p className="text-muted-foreground mx-auto max-w-[600px] text-center text-base text-balance md:text-lg">
              {description}
            </p>
          </div>
          <div className="flex w-full flex-col items-center justify-center gap-3 sm:flex-row">
            <Button className="group hover:ring-primary w-full transform-gpu cursor-pointer overflow-hidden rounded-full text-base tracking-tight transition-all duration-300 ease-out hover:ring-2 hover:ring-offset-2 sm:w-fit">
              {primaryCta}
            </Button>
            <Button
              variant="secondary"
              className="group hover:ring-primary w-full transform-gpu cursor-pointer overflow-hidden rounded-full text-base tracking-tight transition-all duration-300 ease-out hover:ring-2 hover:ring-offset-2 sm:w-fit"
            >
              {secondaryCta}
            </Button>
          </div>
        </div>
        <div className="relative mt-10 h-[500px]">
          <img
            src="https://ui.shadcn.com/placeholder.svg"
            alt="NovaPress Studio analytics dashboard preview"
            className="h-full w-full rounded-3xl border object-cover"
          />
        </div>
      </div>
    </section>
  )
}
