"use client"

import { motion } from "framer-motion"

interface EnterButtonProps {
  onClick: () => void
  disabled?: boolean
}

export function EnterButton({ onClick, disabled }: EnterButtonProps) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="group relative overflow-hidden rounded-full border-2 border-black/80 bg-white/95 px-10 py-4 shadow-lg backdrop-blur-sm transition-all duration-300 hover:bg-black hover:shadow-xl active:bg-black disabled:cursor-not-allowed disabled:opacity-50 sm:px-14 sm:py-5 md:px-20 md:py-6"
    >
      {/* Shimmer effect */}
      <motion.span
        className="absolute inset-0 -z-10 bg-gradient-to-r from-transparent via-white/40 to-transparent"
        animate={{
          x: ["-200%", "200%"],
        }}
        transition={{
          repeat: Number.POSITIVE_INFINITY,
          repeatType: "loop",
          duration: 2.5,
          ease: "linear",
        }}
      />

      {/* Button text - Big black text with elegant serif font */}
      <span className="relative font-[family-name:var(--font-display)] text-2xl font-semibold uppercase tracking-[0.15em] text-black transition-colors duration-300 group-hover:text-white group-active:text-white sm:text-3xl md:text-4xl">
        Enter
      </span>
    </motion.button>
  )
}
