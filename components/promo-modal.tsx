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

  const closeLogin = () => {
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
              <Link href={loginBanner.link} onClick={closeLogin} className="block w-full h-full">
                <Image src={loginBanner.imageUrl} alt="Welcome" fill className="object-cover" priority />
              </Link>
            ) : (
              <Image src={loginBanner.imageUrl} alt="Welcome" fill className="object-cover" priority />
            )}
            <button
              onClick={closeLogin}
              className="absolute right-4 top-12 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur transition-transform hover:scale-110"
            >
              <X className="h-6 w-6" />
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
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ type: "spring", damping: 20 }}
              className="relative w-full max-w-[300px] aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl bg-white"
            >
              <button
                onClick={closePopup}
                className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur transition-transform hover:scale-110"
              >
                <X className="h-5 w-5" />
              </button>
              {popupBanner.link ? (
                <Link href={popupBanner.link} onClick={closePopup} className="block w-full h-full">
                  <Image src={popupBanner.imageUrl} alt="Promotion" fill className="object-cover" />
                </Link>
              ) : (
                <Image src={popupBanner.imageUrl} alt="Promotion" fill className="object-cover" />
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

  if (images.length === 0) return null

  const content = (
    <div className="relative w-full h-20 sm:h-24 overflow-hidden bg-gradient-to-r from-amber-50 to-orange-50">
      {images.map((img, idx) => (
        <div
          key={idx}
          className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${idx === currentIndex ? "opacity-100" : "opacity-0"}`}
        >
          <Image src={img} alt={`Promo ${idx + 1}`} fill className="object-cover" priority={idx === 0} />
        </div>
      ))}
      {images.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
          {images.map((_, idx) => (
            <button
              key={idx}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCurrentIndex(idx) }}
              className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentIndex ? "bg-white w-4 shadow-sm" : "bg-white/50 w-1.5"}`}
            />
          ))}
        </div>
      )}
    </div>
  )

  return link ? <Link href={link} className="block">{content}</Link> : content
}
