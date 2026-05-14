"use client"

import { QRCodeSVG } from "qrcode.react"
import { Scan, ChevronRight } from "lucide-react"
import type { Profile } from "@/lib/supabase/types"
import { useLanguage } from "@/lib/i18n"

interface HomeQRCardProps {
  profile: Profile
  userId: string
  onClick?: () => void
}

export function HomeQRCard({ profile, userId, onClick }: HomeQRCardProps) {
  const { t } = useLanguage()

  return (
    <button
      className="w-full p-6 flex items-center relative overflow-hidden shadow-xl transition-all duration-200 active:scale-[0.99]"
      style={{
        background: "radial-gradient(circle at top right, #ffffff, #f9f9f9)",
        borderRadius: "40px 15px 40px 15px",
        border: "1px solid rgba(154,123,79,0.1)",
        boxShadow: "0 20px 25px -5px rgba(154,123,79,0.05)",
      }}
      onClick={onClick}
    >
      {/* Decorative circle */}
      <div className="absolute -right-8 -top-8 w-24 h-24 rounded-full" style={{ background: "rgba(197,160,112,0.05)" }} />

      {/* QR Code */}
      <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-100 shrink-0">
        <QRCodeSVG
          value={userId}
          size={80}
          level="M"
          includeMargin={false}
          bgColor="#ffffff"
          fgColor="#000000"
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 text-left ml-6">
        <div className="flex items-center gap-2 mb-1">
          <Scan className="w-4 h-4" style={{ color: "#9A7B4F" }} />
          <span className="font-bold text-sm" style={{ color: "#2D2926" }}>{t("customer", "myMemberQR")}</span>
        </div>
        <p className="text-xs text-gray-500 mb-3">{t("customer", "showToStaffCollect")}</p>
        <span
          className="text-[10px] px-3 py-1 rounded-full font-bold tracking-wider"
          style={{ background: "rgba(154,123,79,0.1)", color: "#9A7B4F" }}
        >
          {(profile.full_name || t("customer", "member")).toUpperCase()}
        </span>
      </div>

      {/* Arrow */}
      <ChevronRight className="h-5 w-5 shrink-0 text-gray-300" />
    </button>
  )
}
