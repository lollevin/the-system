import { Button } from "@/components/ui/button"

export function CallToAction() {
  return (
    <section id="cta">
      <div className="container mx-auto w-full p-4 md:p-10">
        <div className="flex flex-col items-center justify-center gap-6">
          <h2 className="text-foreground text-center text-2xl font-medium sm:text-3xl">
            Get started with Magic UI
          </h2>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              size="lg"
              className="hover:ring-primary transform-gpu cursor-pointer overflow-hidden rounded-full text-base tracking-tighter whitespace-pre transition-all duration-300 ease-out hover:ring-2 hover:ring-offset-2"
            >
              Get started
            </Button>
            <Button
              size="lg"
              variant="secondary"
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
