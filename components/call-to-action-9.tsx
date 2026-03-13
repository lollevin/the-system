import { Button } from "@/components/ui/button"

export function CallToAction() {
  return (
    <section id="cta">
      <div className="container mx-auto p-4 md:p-10">
        <div className="border-border mx-auto rounded-xl border p-10">
          <div className="flex flex-col justify-between gap-y-3.5 md:flex-row">
            <div className="flex flex-col gap-y-3 md:items-start">
              <h3 className="text-center text-3xl font-semibold tracking-tight text-balance">
                Get started with MagicUI
              </h3>
              <p className="text-muted-foreground max-w-xl text-center text-base text-balance md:text-left">
                Build a fast and animated marketing website with that converts
                visitors into customers.
              </p>
            </div>
            <Button
              size="lg"
              className="hover:ring-primary transform-gpu cursor-pointer overflow-hidden rounded-full text-base tracking-tighter whitespace-pre transition-all duration-300 ease-out hover:ring-2 hover:ring-offset-2"
            >
              <a href="/">Get started</a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
