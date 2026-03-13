import { Button } from "@/components/ui/button"

export function CallToAction() {
  return (
    <section id="cta">
      <div className="container mx-auto px-4 py-10 md:p-10">
        <div className="grid md:grid-cols-2">
          <div className="relative aspect-video overflow-hidden rounded-xl md:aspect-auto md:h-[300px]">
            <img
              alt="Platform preview"
              className="h-full w-full object-cover object-center"
              src="https://ui.shadcn.com/placeholder.svg"
            />
          </div>
          <div className="flex flex-col justify-center gap-y-3.5 p-7 md:p-10">
            <blockquote className="text-lg leading-snug font-semibold text-balance lg:text-xl lg:leading-normal xl:text-2xl">
              "One of the best and{" "}
              <span className="text-primary bg-lime-400 px-2 dark:bg-lime-500">
                unique react animated library
              </span>{" "}
              component I have seen and it boosed my productivity in no time."
            </blockquote>
            <div className="py-2.5">
              <p className="font-semibold">Jane Smith</p>
              <p className="text-muted-foreground text-sm">
                CEO, Acme Corporation
              </p>
            </div>
            <Button className="w-full" variant="default">
              Buy now
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
