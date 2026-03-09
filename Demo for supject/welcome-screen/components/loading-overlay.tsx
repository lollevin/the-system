"use client"

import { motion, AnimatePresence } from "framer-motion"

interface LoadingOverlayProps {
  isVisible: boolean
}

export function LoadingOverlay({ isVisible }: LoadingOverlayProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm"
        >
          {/* Taupe Spinner */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="relative"
          >
            {/* Outer ring */}
            <motion.div
              className="h-20 w-20 rounded-full border-2 border-taupe/20"
              animate={{ rotate: 360 }}
              transition={{
                repeat: Number.POSITIVE_INFINITY,
                duration: 3,
                ease: "linear",
              }}
            >
              {/* Spinning segment */}
              <motion.div
                className="absolute -top-0.5 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-taupe shadow-[0_0_20px_5px] shadow-taupe/50"
              />
            </motion.div>

            {/* Inner ring */}
            <motion.div
              className="absolute inset-2 rounded-full border border-taupe/30"
              animate={{ rotate: -360 }}
              transition={{
                repeat: Number.POSITIVE_INFINITY,
                duration: 2,
                ease: "linear",
              }}
            >
              <motion.div
                className="absolute -top-0.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-taupe-light"
              />
            </motion.div>

            {/* Center dot */}
            <motion.div
              className="absolute inset-0 m-auto h-2 w-2 rounded-full bg-taupe"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{
                repeat: Number.POSITIVE_INFINITY,
                duration: 1.5,
                ease: "easeInOut",
              }}
            />
          </motion.div>

          {/* Loading Text */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.4 }}
            className="mt-8 flex flex-col items-center gap-3"
          >
            <p className="font-sans text-sm uppercase tracking-[0.3em] text-taupe">
              Loading Assets
            </p>

            {/* Progress bar */}
            <div className="h-0.5 w-48 overflow-hidden bg-taupe/20">
              <motion.div
                className="h-full bg-taupe"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 2.2, ease: "easeInOut" }}
              />
            </div>

            {/* Pulsing dots */}
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="h-1 w-1 rounded-full bg-taupe"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{
                    repeat: Number.POSITIVE_INFINITY,
                    duration: 1.2,
                    delay: i * 0.2,
                    ease: "easeInOut",
                  }}
                />
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
