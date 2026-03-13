"use client"

import { useEffect, useRef } from "react"
import { motion, useInView, useSpring, useTransform } from "motion/react"

import { Card, CardContent } from "@/components/ui/card"

const stats = [
  { value: 3400, label: "Downloads" },
  { value: 1500, label: "Users" },
  { value: 84, label: "Subscribers" },
  { value: 7, label: "Products" },
]

export function Component() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  return (
    <section id="stats" ref={ref}>
      <div className="container space-y-4 p-4 md:space-y-6 md:p-10">
        <div className="mx-auto flex flex-col items-center justify-center gap-3 md:gap-5">
          <p className="text-muted-foreground font-mono text-sm font-medium">
            STATS
          </p>
          <h4 className="mx-auto max-w-3xl text-center text-3xl font-semibold tracking-tighter text-balance md:text-4xl">
            Our numbers speak for themselves
          </h4>
        </div>
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-2 md:gap-8 lg:grid-cols-4">
          {stats.map((stat, index) => (
            <AnimatedCard
              key={index}
              value={stat.value}
              label={stat.label}
              isInView={isInView}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
interface AnimatedCardProps {
  value: number
  label: string
  isInView: boolean
}

function AnimatedCard({ value, label, isInView }: AnimatedCardProps) {
  const spring = useSpring(0, { duration: 2000 })
  const displayValue = useTransform(spring, (current) =>
    Math.floor(current).toLocaleString()
  )

  useEffect(() => {
    if (isInView) {
      spring.set(value)
    }
  }, [isInView, spring, value])

  return (
    <Card className="border-none shadow-none">
      <CardContent className="space-y-1 p-2 text-center sm:p-4">
        <motion.div
          className="text-primary flex items-center justify-center gap-2 font-mono text-3xl font-semibold tracking-tight sm:text-4xl"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.5 }}
        >
          <motion.span>{displayValue}</motion.span>
          {value > 1000 && "+"}
        </motion.div>
        <div className="text-muted-foreground text-sm md:text-base">
          {label}
        </div>
      </CardContent>
    </Card>
  )
}
