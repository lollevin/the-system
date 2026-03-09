"use client"

import { QRCodeSVG } from "qrcode.react"
import type { Profile } from "@/lib/supabase/types"

interface QRCodeSectionProps {
  profile: Profile
  userId: string
}

export function QRCodeSection({ profile, userId }: QRCodeSectionProps) {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="rounded-2xl bg-white p-4 shadow-lg">
        <div className="relative h-48 w-48 flex items-center justify-center bg-white">
          <QRCodeSVG
            value={userId}
            size={180}
            level="M"
            includeMargin={false}
            bgColor="#ffffff"
            fgColor="#000000"
          />
        </div>
      </div>
      <div className="text-center">
        <p className="font-medium text-foreground">{profile.full_name || "Member"}</p>
        <p className="text-sm text-muted-foreground">Show this to staff to earn points</p>
      </div>
    </div>
  )
}
