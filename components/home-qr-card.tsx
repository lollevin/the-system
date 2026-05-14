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
      className="w-full rounded-2xl bg-card border border-border/60 shadow-sm hover:shadow-md transition-all duration-200 active:scale-[0.99]"
      onClick={onClick}
    >
      <div className="p-3.5 flex items-center gap-3.5">
        {/* QR Code - amber background like screenshot */}
        <div className="rounded-xl overflow-hidden shrink-0 bg-white shadow-sm" style={{ padding: "8px" }}>
          <QRCodeSVG
            value={userId}
            size={64}
            level="M"
            includeMargin={false}
            bgColor="#ffffff"
            fgColor="#000000"
          />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Scan className="w-3.5 h-3.5 text-primary" />
            <span className="font-semibold text-foreground text-sm">{t("customer", "myMemberQR")}</span>
          </div>
          <p className="text-[11px] text-muted-foreground mb-1.5">
            {t("customer", "showToStaffCollect")}
          </p>
          <span className="text-[10px] border border-primary/40 text-primary px-2.5 py-0.5 rounded-full font-semibold tracking-widest uppercase">
            {(profile.full_name || t("customer", "member")).toUpperCase()}
          </span>
        </div>

        {/* Arrow */}
        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
      </div>
    </button>
  )
}
