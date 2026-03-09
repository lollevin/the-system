"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Loader2 } from "lucide-react"
import Image from "next/image"

type ScreenState = "welcome" | "loading" | "zooming" | "redirect"

// Background images from Welcome bg pic folder
const bgImages = [
  { src: "/Welcome bg pic/storefront.jpg", alt: "JP&Co Storefront" },
  { src: "/Welcome bg pic/salmon-cheese.jpg", alt: "Salmon with Cheese" },
  { src: "/Welcome bg pic/mentaiko.jpg", alt: "Mentaiko" },
  { src: "/Welcome bg pic/duck-mantau.jpg", alt: "Duck Mantau" },
  { src: "/Welcome bg pic/salad-bowl.jpg", alt: "Salad Bowl" },
  { src: "/Welcome bg pic/salmon-ikura.jpg", alt: "Salmon Ikura" },
  { src: "/Welcome bg pic/food-spread.jpg", alt: "Food Spread" },
  { src: "/Welcome bg pic/menu.jpg", alt: "Menu" },
]

export default function WelcomePage() {
  const [screenState, setScreenState] = useState<ScreenState>("welcome")
  const router = useRouter()

  const handleEnter = () => {
    setScreenState("loading")
  }

  useEffect(() => {
    if (screenState === "loading") {
      // Show loading for 1.5 seconds then zoom
      const timer = setTimeout(() => {
        setScreenState("zooming")
      }, 1500)
      return () => clearTimeout(timer)
    }
    
    if (screenState === "zooming") {
      // Zoom animation for 0.8 seconds then redirect
      const timer = setTimeout(() => {
        router.push("/login")
      }, 800)
      return () => clearTimeout(timer)
    }
  }, [screenState, router])

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-[#3D2E2A] touch-manipulation">
      {/* Animated Grid Background with Images - 2x4 on mobile, 4x2 on desktop */}
      <motion.div 
        className="absolute inset-0 grid grid-cols-2 grid-rows-4 sm:grid-cols-4 sm:grid-rows-2 gap-0.5 sm:gap-1 p-0.5 sm:p-1 opacity-80"
        animate={{
          scale: screenState === "zooming" ? 2 : 1,
          opacity: screenState === "zooming" ? 0 : 0.8,
        }}
        transition={{
          duration: 0.8,
          ease: [0.4, 0, 0.2, 1],
        }}
      >
        {bgImages.map((image, index) => (
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
              src={image.src}
              alt={image.alt}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 50vw, 25vw"
            />
          </motion.div>
        ))}
      </motion.div>

      {/* Gradient Overlay */}
      <motion.div 
        className="absolute inset-0 bg-gradient-to-b from-[#3D2E2A]/40 via-[#3D2E2A]/60 to-[#3D2E2A]/40"
        animate={{
          opacity: screenState === "zooming" ? 0 : 1,
        }}
        transition={{ duration: 0.6 }}
      />
      
      {/* Vignette overlay */}
      <motion.div 
        className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,#3D2E2A_85%)]"
        animate={{
          opacity: screenState === "zooming" ? 0 : 1,
        }}
        transition={{ duration: 0.6 }}
      />

      {/* Content */}
      <AnimatePresence mode="wait">
        {screenState === "welcome" && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="relative z-10 flex h-full flex-col items-center justify-center gap-4 sm:gap-8 px-4 sm:px-6"
          >
            {/* Logo */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="flex flex-col items-center"
            >
              <Image
                src="/Logo/w768.png"
                alt="JP&Co"
                width={200}
                height={80}
                className="h-auto w-[160px] sm:w-[200px]"
                priority
              />
            </motion.div>

            {/* Tagline */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="text-[10px] sm:text-xs tracking-[0.2em] sm:tracking-[0.25em] text-[#C4B5A8]/70 uppercase text-center"
            >
              Casual Dining / Cakes / Coffee
            </motion.p>

            {/* Enter Button - Touch optimized */}
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.5 }}
              onClick={handleEnter}
              whileHover={{ 
                scale: 1.05, 
                backgroundColor: "#C4B5A8", 
                color: "#3D2E2A",
                transition: { duration: 0.15 }
              }}
              whileTap={{ 
                scale: 0.92,
                backgroundColor: "#C4B5A8", 
                color: "#3D2E2A",
                transition: { duration: 0.1 }
              }}
              className="mt-6 sm:mt-8 rounded-full border-2 border-[#C4B5A8] bg-transparent px-10 sm:px-14 py-4 text-base sm:text-lg font-medium uppercase tracking-[0.15em] sm:tracking-[0.2em] text-[#C4B5A8] active:bg-[#C4B5A8] active:text-[#3D2E2A] min-h-[52px]"
            >
              Enter
            </motion.button>

            {/* Subtle hint */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 1 }}
              className="text-xs text-[#C4B5A8]/40 mt-4"
            >
              Member Rewards Program
            </motion.p>
          </motion.div>
        )}

        {screenState === "loading" && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="relative z-10 flex h-full flex-col items-center justify-center gap-6 px-6"
          >
            {/* Logo */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center"
            >
              <Image
                src="/Logo/w768.png"
                alt="JP&Co"
                width={150}
                height={60}
                className="h-auto w-[120px] sm:w-[150px]"
              />
            </motion.div>

            {/* Loading Spinner */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="flex flex-col items-center gap-3"
            >
              <div className="relative">
                <Loader2 className="w-8 h-8 text-[#C4B5A8] animate-spin" />
              </div>
              <p className="text-sm text-[#C4B5A8]/60">Loading...</p>
            </motion.div>

            {/* Progress bar */}
            <motion.div
              className="w-48 h-1 bg-[#C4B5A8]/20 rounded-full overflow-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <motion.div
                className="h-full bg-[#C4B5A8]"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 1.3, ease: "easeInOut" }}
              />
            </motion.div>
          </motion.div>
        )}

        {screenState === "zooming" && (
          <motion.div
            key="zooming"
            initial={{ opacity: 1, scale: 1 }}
            animate={{ 
              opacity: 0,
              scale: 3,
            }}
            transition={{ 
              duration: 0.8, 
              ease: [0.4, 0, 0.2, 1],
            }}
            className="relative z-10 flex h-full flex-col items-center justify-center"
          >
            {/* Zoom effect with logo */}
            <motion.div
              initial={{ opacity: 1 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
              className="flex flex-col items-center"
            >
              <Image
                src="/Logo/w768.png"
                alt="JP&Co"
                width={150}
                height={60}
                className="h-auto w-[120px] sm:w-[150px]"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom decorative line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C4B5A8]/30 to-transparent" />
    </div>
  )
}
