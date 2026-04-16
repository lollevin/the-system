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
  const [banner, setBanner] = useState<BannerData | null>(null)
  const [visible, setVisible] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchTopBanner = async () => {
      try {
        const { data } = await supabase
          .from("global_settings")
          .select("value")
          .eq("key", "banner_topbar")
          .single()

        if (data?.value?.isActive && data?.value?.imageUrl) {
          setBanner(data.value)
        }
      } catch (err) {
        console.error("Top banner fetch error:", err)
      }
    }
    fetchTopBanner()
  }, [])

  if (!banner || !visible) return null

  const content = (
    <div className="relative w-full h-12 sm:h-14 overflow-hidden bg-amber-100">
      <Image src={banner.imageUrl} alt="Promotion" fill className="object-cover" />
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setVisible(false) }}
        className="absolute right-2 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )

  return banner.link ? <Link href={banner.link} className="block">{content}</Link> : content
}
