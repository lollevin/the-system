"use client"

import { motion } from "framer-motion"
import Image from "next/image"

// JP&Co actual food images
const foodImages = [
  { src: "/images/20241001-195940-20-281-29.jpg", alt: "JP&Co food spread with various dishes" },
  { src: "/images/55023632542-660a8456fb-b.jpg", alt: "Fresh colorful salad bowl" },
  { src: "/images/20241001-194627-rotated.jpg", alt: "Signature salmon dome with ikura" },
]

export function ScrollingBackground() {
  // Duplicate images multiple times for seamless loop
  const allImages = [...foodImages, ...foodImages, ...foodImages, ...foodImages, ...foodImages, ...foodImages]

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden">
      {/* Top row - scrolls LEFT */}
      <div className="relative h-1/3 w-full overflow-hidden">
        <motion.div
          className="flex h-full gap-2 sm:gap-4"
          animate={{
            x: [0, -200 * 6],
          }}
          transition={{
            x: {
              repeat: Number.POSITIVE_INFINITY,
              repeatType: "loop",
              duration: 40,
              ease: "linear",
            },
          }}
        >
          {allImages.map((image, index) => (
            <div
              key={`row1-${index}`}
              className="relative h-full w-52 shrink-0 overflow-hidden rounded-lg sm:w-72 md:w-[400px]"
            >
              <Image
                src={image.src || "/placeholder.svg"}
                alt={image.alt}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 208px, (max-width: 768px) 288px, 400px"
                priority={index < 3}
              />
            </div>
          ))}
        </motion.div>
      </div>

      {/* Middle row - scrolls RIGHT */}
      <div className="relative h-1/3 w-full overflow-hidden">
        <motion.div
          className="flex h-full gap-2 sm:gap-4"
          initial={{ x: -200 * 6 }}
          animate={{
            x: [-200 * 6, 0],
          }}
          transition={{
            x: {
              repeat: Number.POSITIVE_INFINITY,
              repeatType: "loop",
              duration: 45,
              ease: "linear",
            },
          }}
        >
          {[...allImages].reverse().map((image, index) => (
            <div
              key={`row2-${index}`}
              className="relative h-full w-52 shrink-0 overflow-hidden rounded-lg sm:w-72 md:w-[400px]"
            >
              <Image
                src={image.src || "/placeholder.svg"}
                alt={image.alt}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 208px, (max-width: 768px) 288px, 400px"
              />
            </div>
          ))}
        </motion.div>
      </div>

      {/* Bottom row - scrolls LEFT */}
      <div className="relative h-1/3 w-full overflow-hidden">
        <motion.div
          className="flex h-full gap-2 sm:gap-4"
          animate={{
            x: [0, -200 * 6],
          }}
          transition={{
            x: {
              repeat: Number.POSITIVE_INFINITY,
              repeatType: "loop",
              duration: 35,
              ease: "linear",
            },
          }}
        >
          {allImages.map((image, index) => (
            <div
              key={`row3-${index}`}
              className="relative h-full w-52 shrink-0 overflow-hidden rounded-lg sm:w-72 md:w-[400px]"
            >
              <Image
                src={image.src || "/placeholder.svg"}
                alt={image.alt}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 208px, (max-width: 768px) 288px, 400px"
              />
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  )
}
