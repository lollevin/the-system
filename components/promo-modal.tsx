"use client"

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"

interface BannerData {
  imageUrl: string
  link?: string
  isActive?: boolean
  images?: string[]
}

export function PromoModal() {
  const [loginBanner, setLoginBanner] = useState<BannerData | null>(null)
  const [popupBanner, setPopupBanner] = useState<BannerData | null>(null)
  const [showLogin, setShowLogin] = useState(false)
  const [showPopup, setShowPopup] = useState(false)
  const [skipCountdown, setSkipCountdown] = useState(3)
  const supabase = createClient()

  useEffect(() => {
    fetchBanners()
  }, [])

  const fetchBanners = async () => {
    try {
      const { data } = await supabase
        .from("global_settings")
        .select("key, value")
        .in("key", ["banner_login", "banner_popup"])

      if (!data) return

      let loginData: BannerData | null = null
      let popupData: BannerData | null = null

      data.forEach(item => {
        if (item.key === "banner_login" && item.value?.isActive && item.value?.imageUrl) {
          loginData = item.value
        }
        if (item.key === "banner_popup" && item.value?.isActive && item.value?.imageUrl) {
          popupData = item.value
        }
      })

      setLoginBanner(loginData)
      setPopupBanner(popupData)

      const loginShown = sessionStorage.getItem("banner_login_shown")
      if (!loginShown && loginData) {
        setTimeout(() => setShowLogin(true), 300)
      } else {
        const popupShown = sessionStorage.getItem("banner_popup_shown")
        if (!popupShown && popupData) {
          setTimeout(() => setShowPopup(true), 800)
        }
      }
    } catch (err) {
      console.error("Banner fetch error:", err)
    }
  }

  // Countdown for Skip button (like Zus Coffee)
  useEffect(() => {
    if (!showLogin) return
    setSkipCountdown(3)
    const interval = setInterval(() => {
      setSkipCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [showLogin])

  const closeLogin = () => {
    if (skipCountdown > 0) return
    setShowLogin(false)
    sessionStorage.setItem("banner_login_shown", "true")
    const popupShown = sessionStorage.getItem("banner_popup_shown")
    if (!popupShown && popupBanner) {
      setTimeout(() => setShowPopup(true), 300)
    }
  }

  const closePopup = () => {
    setShowPopup(false)
    sessionStorage.setItem("banner_popup_shown", "true")
  }

  return (
    <>
      <AnimatePresence>
        {showLogin && loginBanner && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black"
          >
            {loginBanner.link ? (
              <Link
                href={loginBanner.link}
                onClick={() => {
                  sessionStorage.setItem("banner_login_shown", "true")
                  setShowLogin(false)
                }}
                className="block w-full h-full"
              >
                <Image src={loginBanner.imageUrl} alt="Welcome" fill className="object-cover" priority />
              </Link>
            ) : (
              <Image src={loginBanner.imageUrl} alt="Welcome" fill className="object-cover" priority />
            )}

            {/* Skip button (like Zus Coffee) - disabled for first 3 seconds */}
            <button
              onClick={closeLogin}
              disabled={skipCountdown > 0}
              className={`absolute right-4 top-12 z-10 flex items-center gap-1.5 px-4 py-2 rounded-full backdrop-blur-md border border-white/30 text-white text-sm font-semibold shadow-lg transition-all ${
                skipCountdown > 0
                  ? "bg-black/40 cursor-not-allowed opacity-80"
                  : "bg-black/50 hover:bg-black/70 active:scale-95"
              }`}
            >
              <span>Skip</span>
              {skipCountdown > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-[11px] font-bold tabular-nums">
                  {skipCountdown}
                </span>
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPopup && popupBanner && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closePopup}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ type: "spring", damping: 20 }}
              className="relative w-full max-w-[360px] sm:max-w-[400px]"
            >
              <button
                onClick={closePopup}
                aria-label="Close"
                className="absolute -right-1 -top-10 sm:-right-10 sm:top-0 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-gray-800 shadow-lg transition-all hover:scale-110 hover:bg-white active:scale-95"
              >
                <X className="h-5 w-5" strokeWidth={2.5} />
              </button>
              {popupBanner.link ? (
                <Link href={popupBanner.link} onClick={closePopup} className="block w-full">
                  <img
                    src={popupBanner.imageUrl}
                    alt="Promotion"
                    className="w-full h-auto max-h-[80vh] object-contain rounded-2xl shadow-2xl"
                  />
                </Link>
              ) : (
                <img
                  src={popupBanner.imageUrl}
                  alt="Promotion"
                  className="w-full h-auto max-h-[80vh] object-contain rounded-2xl shadow-2xl"
                />
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}

export function TopBanner() {
  const [images, setImages] = useState<string[]>([])
  const [link, setLink] = useState<string>("")
  const [currentIndex, setCurrentIndex] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    const fetchTopBanner = async () => {
      try {
        const { data } = await supabase
          .from("global_settings")
          .select("value")
          .eq("key", "banner_topbar")
          .single()

        if (data?.value?.isActive) {
          if (data.value.images && data.value.images.length > 0) {
            setImages(data.value.images)
          } else if (data.value.imageUrl) {
            setImages([data.value.imageUrl])
          }
          if (data.value.link) setLink(data.value.link)
        }
      } catch (err) {
        console.error("Top banner fetch error:", err)
      }
    }
    fetchTopBanner()
  }, [])

  useEffect(() => {
    if (images.length <= 1) return
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length)
    }, 3000)
    return () => clearInterval(timer)
  }, [images.length])

  // Default JP&Co branded hero when admin hasn't uploaded any banner
  if (images.length === 0) {
    return (
      <div className="relative w-full h-44 sm:h-52 overflow-hidden bg-[#ede8df]">
        {/* Diagonal white section - bottom right */}
        <div
          className="absolute inset-0 bg-white"
          style={{ clipPath: "polygon(52% 0%, 100% 0%, 100% 100%, 22% 100%)" }}
        />
        {/* Brand content */}
        <div className="relative z-10 flex flex-col justify-center h-full px-8">
          <h1
            className="text-6xl sm:text-7xl font-light leading-none tracking-tight"
            style={{ color: "#b5902a", fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            JP&amp;Co
          </h1>
          <p className="text-[10px] sm:text-xs tracking-[0.28em] mt-2 text-[#8a7a60] uppercase">
            Casual Dining&nbsp;•&nbsp;Roastery
          </p>
        </div>
      </div>
    )
  }

  const content = (
    <div className="relative w-full h-44 sm:h-56 md:h-64 overflow-hidden bg-gradient-to-r from-amber-50 to-orange-50 group">
      {/* Images */}
      {images.map((img, idx) => (
        <div
          key={idx}
          className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${idx === currentIndex ? "opacity-100" : "opacity-0"}`}
        >
          <Image src={img} alt={`Promo ${idx + 1}`} fill className="object-cover group-hover:scale-105 transition-transform duration-700" priority={idx === 0} />
        </div>
      ))}

      {/* Glass Effect Overlay - Subtle gradient at bottom */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/30 via-black/10 to-transparent pointer-events-none" />

      {/* Frosted glass strip at bottom for dots */}
      {images.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-md border border-white/30 shadow-lg">
          {images.map((_, idx) => (
            <button
              key={idx}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCurrentIndex(idx) }}
              className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentIndex ? "bg-white w-5 shadow-sm" : "bg-white/60 w-1.5"}`}
            />
          ))}
        </div>
      )}

    </div>
  )

  return link ? <Link href={link} className="block">{content}</Link> : content
}
