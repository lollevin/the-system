"use client"

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"
import Image from "next/image"

import { createClient } from "@/lib/supabase/client"

interface PromoModalProps {
  onClose?: () => void
}

export function PromoModal({ onClose }: PromoModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [promoData, setPromoData] = useState<{ imageUrl: string; link?: string; isActive?: boolean } | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function fetchPromo() {
      // Check if promo has been shown in this session
      const hasShown = sessionStorage.getItem("promo_shown")
      if (hasShown) return

      try {
        const { data, error } = await supabase
          .from("global_settings")
          .select("value")
          .eq("key", "promo_banner")
          .single()
        
        if (!error && data?.value?.isActive) {
          setPromoData(data.value)
          
          // Small delay before showing
          setTimeout(() => {
            setIsOpen(true)
          }, 1000)
        }
      } catch (err) {
        console.error("Failed to fetch promo banner:", err)
      }
    }
    
    fetchPromo()
  }, [])

  const handleClose = () => {
    setIsOpen(false)
    sessionStorage.setItem("promo_shown", "true")
    if (onClose) onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-sm aspect-[3/4] overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            {/* Close Button */}
            <button
              onClick={handleClose}
              className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/20 text-white backdrop-blur-md transition-transform hover:scale-110 active:scale-95"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Promo Image */}
            <div className="relative h-full w-full">
              {promoData?.imageUrl ? (
                <div className="h-full w-full bg-[#f8f5f2] flex items-center justify-center">
                   {/* If file exists show it, else show a stylized placeholder as requested */}
                   <Image
                      src={promoData.imageUrl}
                      alt="Promotion"
                      fill
                      className="object-cover"
                      onError={(e) => {
                        // If image fails to load, we can show a nice placeholder
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                   />
                   {/* Default placeholder style if no image is provided yet */}
                   <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
                      <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                        <Image src="/Logo/w768.png" alt="Logo" width={60} height={24} className="opacity-50" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-primary">New Arrivals!</h3>
                        <p className="text-sm text-muted-foreground mt-2">Check out our latest coffee beans and exclusive offers.</p>
                      </div>
                      <div className="pt-4">
                        <button 
                          onClick={handleClose}
                          className="px-6 py-2 bg-primary text-white rounded-full text-sm font-medium"
                        >
                          View Offers
                        </button>
                      </div>
                   </div>
                </div>
              ) : (
                <div className="h-full w-full bg-secondary flex items-center justify-center">
                  <p className="text-muted-foreground">Loading Promotion...</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
