function BlurHeader() {
  return (
    <header className="sticky top-0 z-20 mx-auto flex w-full items-center justify-between p-5 sm:px-10">
      <div className="pointer-events-none absolute inset-0 z-[1] h-[20vh] [mask-image:linear-gradient(0deg,transparent_0%,#000_12.5%,#000_25%,transparent_37.5%)] backdrop-blur-[0.0625px]"></div>
      <div className="pointer-events-none absolute inset-0 z-[2] h-[20vh] [mask-image:linear-gradient(0deg,transparent_12.5%,#000_25%,#000_37.5%,transparent_50%)] backdrop-blur-[0.125px]"></div>
      <div className="pointer-events-none absolute inset-0 z-[3] h-[20vh] [mask-image:linear-gradient(0deg,transparent_25%,#000_37.5%,#000_50%,transparent_62.5%)] backdrop-blur-[0.25px]"></div>
      <div className="pointer-events-none absolute inset-0 z-[4] h-[20vh] [mask-image:linear-gradient(0deg,transparent_37.5%,#000_50%,#000_62.5%,transparent_75%)] backdrop-blur-[0.5px]"></div>
      <div className="pointer-events-none absolute inset-0 z-[5] h-[20vh] [mask-image:linear-gradient(0deg,transparent_50%,#000_62.5%,#000_75%,transparent_87.5%)] backdrop-blur-[1px]"></div>
      <div className="pointer-events-none absolute inset-0 z-[6] h-[20vh] [mask-image:linear-gradient(0deg,transparent_62.5%,#000_75%,#000_87.5%,transparent_100%)] backdrop-blur-[2px]"></div>
      <div className="pointer-events-none absolute inset-0 z-[7] h-[20vh] [mask-image:linear-gradient(0deg,transparent_75%,#000_87.5%,#000_100%,transparent_112.5%)] backdrop-blur-[4px]"></div>
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between">
        <a className="z-[10]" href="/">
          Magicui
        </a>
        <div className="z-[10]">
          <a href="#" className="">
            Get Started
          </a>
        </div>
      </div>
    </header>
  )
}

export function Header() {
  return (
    <div className="relative h-[100vh] w-full overflow-y-auto">
      <BlurHeader />
      <div className="w-full">
        <div className="mx-auto flex h-[200vh] w-full max-w-3xl flex-col items-center justify-center gap-y-5">
          <img
            className="h-20 w-20"
            src="/android-chrome-512x512.png"
            alt="MagicUI Logo"
          />
          <h1 className="text-center text-4xl font-bold text-balance">
            UI library for Design Engineers
          </h1>
          <p className="text-center text-balance">
            50+ open-source animated components built with React, Typescript,
            Tailwind CSS, and Framer Motion. Save thousands of hours, create a
            beautiful landing page, and convert your visitors into customers.
          </p>
        </div>
      </div>
    </div>
  )
}
