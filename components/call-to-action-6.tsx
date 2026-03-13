export function CallToAction() {
  return (
    <section id="cta">
      <div className="container mx-auto w-full p-4 md:p-10">
        <div className="bg-muted border-border flex flex-col items-center justify-center gap-4 rounded-xl border p-10 shadow-inner">
          <h3 className="text-center text-2xl font-semibold tracking-tight text-balance sm:text-4xl">
            Get started with MagicUI
          </h3>
          <p className="text-muted-foreground max-w-xl text-center text-base text-balance md:text-lg">
            Build a fast and animated marketing website with that converts
            visitors into customers.
          </p>
          <a
            href="#"
            className="shadow-small border-border bg-primary text-primary-foreground flex h-10 w-48 items-center justify-center gap-2.5 rounded-full border font-medium shadow-[4px_4px_0_0_rgba(0,0,0,0.9)] transition-all duration-150 active:translate-x-[2px] active:translate-y-[2px] active:scale-95 active:shadow-none"
          >
            Get started
          </a>
        </div>
      </div>
    </section>
  )
}
