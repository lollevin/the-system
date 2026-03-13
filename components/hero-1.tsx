"use client"

import { useRef } from "react"
import { ChevronRight } from "lucide-react"
import { motion, useInView } from "motion/react"

import { cn } from "@/lib/utils"
import { BorderBeam } from "@/components/ui/border-beam"
import { Button } from "@/components/ui/button"

export function Hero() {
  const fadeInRef = useRef(null)
  const fadeInInView = useInView(fadeInRef, {
    once: true,
  })

  const fadeUpVariants = {
    initial: {
      opacity: 0,
      y: 24,
    },
    animate: {
      opacity: 1,
      y: 0,
    },
  }

  return (
    <section id="hero">
      <div className="relative h-full overflow-hidden px-4 py-20 md:p-10 md:py-20">
        <div className="z-10 container flex flex-col">
          <div className="mt-20 grid grid-cols-1">
            <div className="flex flex-col items-center gap-6">
              <div className="flex flex-col items-center gap-3">
                <motion.h1
                  ref={fadeInRef}
                  className="from-foreground to-foreground/60 bg-linear-to-br from-30% bg-clip-text text-4xl leading-[1.2] font-semibold tracking-tighter text-balance text-transparent sm:text-5xl md:text-6xl md:leading-none"
                  animate={fadeInInView ? "animate" : "initial"}
                  variants={fadeUpVariants}
                  initial={false}
                  transition={{
                    duration: 0.6,
                    delay: 0.1,
                    ease: [0.21, 0.47, 0.32, 0.98],
                    type: "spring",
                  }}
                >
                  Create Magical <br /> Landing Pages <br />
                </motion.h1>

                <motion.p
                  className="text-muted-foreground max-w-2xl text-center text-lg font-medium tracking-tight text-balance md:text-xl"
                  animate={fadeInInView ? "animate" : "initial"}
                  variants={fadeUpVariants}
                  initial={false}
                  transition={{
                    duration: 0.6,
                    delay: 0.2,
                    ease: [0.21, 0.47, 0.32, 0.98],
                    type: "spring",
                  }}
                >
                  Magic UI is a curated collection of React + Tailwind CSS +
                  Framer Motion components
                </motion.p>
              </div>
              <motion.div
                animate={fadeInInView ? "animate" : "initial"}
                variants={fadeUpVariants}
                className="flex w-full flex-col gap-4 md:flex-row"
                initial={false}
                transition={{
                  duration: 0.6,
                  delay: 0.3,
                  ease: [0.21, 0.47, 0.32, 0.98],
                  type: "spring",
                }}
              >
                <Button
                  asChild
                  className={cn(
                    "group mx-auto w-full overflow-hidden rounded-full text-sm tracking-tight whitespace-pre sm:w-fit md:flex md:text-base",
                    "hover:ring-primary transform-gpu transition-all duration-300 ease-out hover:ring-2 hover:ring-offset-2"
                  )}
                >
                  <a href="#">
                    Get Started
                    <ChevronRight className="size-4 translate-x-0 transition-all duration-300 ease-out group-hover:translate-x-1" />
                  </a>
                </Button>
              </motion.div>
            </div>
          </div>

          <motion.div
            animate={fadeInInView ? "animate" : "initial"}
            variants={fadeUpVariants}
            initial={false}
            transition={{
              duration: 1.4,
              delay: 0.4,
              ease: [0.21, 0.47, 0.32, 0.98],
              type: "spring",
            }}
            className="relative mt-10 h-full w-full rounded-md after:absolute after:inset-0 after:z-10 after:[background:linear-gradient(to_top,#fff_30%,transparent)] dark:after:[background:linear-gradient(to_top,#000000_30%,transparent)]"
          >
            <div
              className={cn(
                "absolute inset-0 bottom-1/2 h-full w-full transform-gpu filter-[blur(120px)]",
                "bg-[linear-gradient(to_bottom,var(--primary),transparent_30%)]"
              )}
            />

            <img
              src="/dashboard-light.png"
              className="relative block h-full w-full rounded-md border dark:hidden"
            />
            <img
              src="/dashboard-dark.png"
              className="relative hidden h-full w-full rounded-md border dark:block"
            />
            {/* <video
              autoPlay
              loop
              muted
              src="demo.mp4"
              className="h-auto w-full"
            /> */}

            <BorderBeam size={150} />
            <BorderBeam size={150} delay={7} />
          </motion.div>
        </div>
      </div>
    </section>
  )
}
