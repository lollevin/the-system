"use client"

import { motion } from "framer-motion"
import Image from "next/image"

interface LogoProps {
  size?: "default" | "small"
}

export function Logo({ size = "default" }: LogoProps) {
  const isSmall = size === "small"

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Decorative line above */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className={`h-px bg-gradient-to-r from-transparent via-taupe to-transparent ${
          isSmall ? "w-16 sm:w-20" : "w-20 sm:w-28 md:w-36"
        }`}
      />

      {/* JP&Co Logo Image */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="relative"
      >
        <Image
          src="/images/jpco-logo.png"
          alt="JP&Co - Casual Dining / Cakes / Coffee Roastery"
          width={isSmall ? 120 : 180}
          height={isSmall ? 48 : 72}
          className="h-auto w-[140px] object-contain sm:w-[180px] md:w-[220px]"
          priority
        />
      </motion.div>

      {/* Decorative line below */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className={`h-px bg-gradient-to-r from-transparent via-taupe to-transparent ${
          isSmall ? "w-16 sm:w-20" : "w-20 sm:w-28 md:w-36"
        }`}
      />
    </div>
  )
}
