"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"

const images = [
  { src: "/images/storefront.jpg", alt: "JP&Co Storefront" },
  { src: "/images/salmon-cheese.jpg", alt: "Salmon with Cheese" },
  { src: "/images/mentaiko.jpg", alt: "Mentaiko Pasta" },
  { src: "/images/duck-mantau.jpg", alt: "Crispy Duck Mantau" },
  { src: "/images/salad-bowl.jpg", alt: "Fresh Salad Bowl" },
  { src: "/images/salmon-ikura.jpg", alt: "Salmon with Ikura" },
  { src: "/images/food-spread.jpg", alt: "Food Spread" },
  { src: "/images/menu.jpg", alt: "Menu" },
]

export function WelcomeScreen() {
  const [hasEntered, setHasEntered] = useState(false)

  const handleEnter = () => {
    setHasEntered(true)
  }

  return (
    <div className="relative h-screen w-full overflow-hidden bg-[#3D2E2A]">
      {/* Animated Grid Background */}
      <div className="absolute inset-0 grid grid-cols-4 grid-rows-2 gap-1 p-1 opacity-80">
        {images.map((image, index) => (
          <motion.div
            key={image.src}
            className="relative overflow-hidden"
            initial={{ opacity: 0, scale: 1.2 }}
            animate={{ 
              opacity: 1, 
              scale: [1, 1.05, 1],
            }}
            transition={{
              opacity: { duration: 0.8, delay: index * 0.1 },
              scale: {
                duration: 8,
                repeat: Infinity,
                repeatType: "reverse",
                delay: index * 0.5,
                ease: "easeInOut"
              }
            }}
          >
            <Image
              src={image.src || "/placeholder.svg"}
              alt={image.alt}
              fill
              className="object-cover"
              sizes="25vw"
            />
          </motion.div>
        ))}
      </div>

      {/* Gradient Overlay - lighter for brighter images */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#3D2E2A]/30 via-[#3D2E2A]/50 to-[#3D2E2A]/30" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,#3D2E2A_80%)]" />

      {/* Content */}
      <AnimatePresence mode="wait">
        {!hasEntered ? (
          <motion.div
            key="welcome"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="relative z-10 flex h-full flex-col items-center justify-center gap-8 px-6"
          >
            {/* Logo */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              <Image
                src="/images/jpco-logo.png"
                alt="JP&Co"
                width={180}
                height={72}
                className="h-auto w-[140px] sm:w-[180px]"
                priority
              />
            </motion.div>

            {/* Tagline */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="font-sans text-xs tracking-[0.25em] text-[#C4B5A8] sm:text-sm"
            >
              CASUAL DINING / CAKES / COFFEE
            </motion.p>

            {/* Enter Button */}
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.7 }}
              onClick={handleEnter}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="mt-4 rounded-full border-2 border-[#C4B5A8] bg-transparent px-12 py-4 font-[family-name:var(--font-display)] text-lg font-medium uppercase tracking-[0.2em] text-[#C4B5A8] transition-all duration-300 hover:bg-[#C4B5A8] hover:text-[#3D2E2A] sm:px-16 sm:py-5 sm:text-xl"
            >
              Enter
            </motion.button>
          </motion.div>
        ) : (
          <motion.div
            key="entered"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="relative z-10 flex h-full flex-col items-center justify-center gap-6 px-6"
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Image
                src="/images/jpco-logo.png"
                alt="JP&Co"
                width={120}
                height={48}
                className="h-auto w-[100px] sm:w-[120px]"
              />
            </motion.div>
            <motion.h2
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="font-[family-name:var(--font-display)] text-xl text-[#C4B5A8] sm:text-2xl"
            >
              Welcome
            </motion.h2>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
