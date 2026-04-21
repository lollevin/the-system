"use client"

import { useState } from "react"
import {
  User,
  ChevronRight,
  MapPin,
  CreditCard,
  Bell,
  Star,
  Headphones,
  Shield,
  LogOut,
  Globe,
  Loader2,
  Check,
} from "lucide-react"
import type { User as SupabaseUser } from "@supabase/supabase-js"
import type { Profile } from "@/lib/supabase/types"
import { useLanguage, type Language } from "@/lib/i18n"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface MeTabProps {
  user: SupabaseUser
  profile: Profile
  notificationCount?: number
  onEditProfile: () => void
  onShowSupport: () => void
  onShowNotifications: () => void
}

export function MeTab({
  user,
  profile,
  notificationCount = 0,
  onEditProfile,
  onShowSupport,
  onShowNotifications,
}: MeTabProps) {
  const { t, language, setLanguage } = useLanguage()
  const supabase = createClient()
  const router = useRouter()
  const [showLangPicker, setShowLangPicker] = useState(false)
  const [isLogoutLoading, setIsLogoutLoading] = useState(false)

  const initial = profile.full_name?.[0]?.toUpperCase() || "U"
  const phone = profile.phone || ""

  const handleLogout = async () => {
    setIsLogoutLoading(true)
    try {
      await supabase.auth.signOut()
      router.push("/login")
    } catch {
      toast.error("Failed to logout")
      setIsLogoutLoading(false)
    }
  }

  const langOptions: { id: Language; label: string; native: string }[] = [
    { id: "en", label: "English", native: "English" },
    { id: "zh", label: "中文", native: "中文" },
    { id: "ms", label: "Bahasa Melayu", native: "Melayu" },
  ]

  const currentLangLabel = langOptions.find((l) => l.id === language)?.label || "English"

  const menuGroups: Array<
    Array<{
      icon: typeof MapPin
      label: string
      onClick?: () => void
      iconColor: string
      iconBg: string
      badge?: number
      danger?: boolean
      rightText?: string
    }>
  > = [
    [
      {
        icon: MapPin,
        label: t("customer", "savedAddresses"),
        onClick: () => toast.info(t("customer", "savedAddresses") + " - Coming soon"),
        iconColor: "text-rose-600",
        iconBg: "bg-rose-500/10",
      },
      {
        icon: CreditCard,
        label: t("customer", "paymentMethods"),
        onClick: () => toast.info(t("customer", "paymentMethods") + " - Coming soon"),
        iconColor: "text-blue-600",
        iconBg: "bg-blue-500/10",
      },
      {
        icon: Bell,
        label: t("customer", "notificationSettings"),
        onClick: onShowNotifications,
        iconColor: "text-amber-600",
        iconBg: "bg-amber-500/10",
        badge: notificationCount > 0 ? notificationCount : undefined,
      },
    ],
    [
      {
        icon: Star,
        label: t("customer", "myReviews"),
        onClick: () => toast.info(t("customer", "myReviews") + " - Coming soon"),
        iconColor: "text-yellow-600",
        iconBg: "bg-yellow-500/10",
      },
      {
        icon: Headphones,
        label: t("customer", "contactSupport"),
        onClick: onShowSupport,
        iconColor: "text-violet-600",
        iconBg: "bg-violet-500/10",
      },
    ],
    [
      {
        icon: Globe,
        label: t("customer", "changeLanguage"),
        onClick: () => setShowLangPicker((v) => !v),
        iconColor: "text-teal-600",
        iconBg: "bg-teal-500/10",
        rightText: currentLangLabel,
      },
      {
        icon: Shield,
        label: t("customer", "privacySecurity"),
        onClick: () => toast.info(t("customer", "privacySecurity") + " - Coming soon"),
        iconColor: "text-slate-600",
        iconBg: "bg-slate-500/10",
      },
    ],
  ]

  return (
    <div className="flex flex-col gap-4 px-4 py-3">
      {/* Profile Header Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#8b6f47] via-[#a07d50] to-[#c8a775] p-5 text-white shadow-lg">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex items-center gap-4">
          <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-white/20 text-2xl font-bold backdrop-blur-sm ring-2 ring-white/30">
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-xl font-bold">{profile.full_name || "Member"}</h2>
            {phone && <p className="mt-0.5 text-sm text-white/85">{phone}</p>}
            <button
              onClick={onEditProfile}
              className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur-sm transition-all hover:bg-white/30 active:scale-95"
            >
              {t("customer", "editProfile")}
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Language Picker (expands under the button when clicked) */}
      {showLangPicker && (
        <div className="rounded-2xl border border-[#8b6f47]/30 bg-card p-3 shadow-sm">
          <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("customer", "language")}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {langOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => {
                  setLanguage(opt.id)
                  setShowLangPicker(false)
                  toast.success(`${t("customer", "languageSetTo")} ${opt.label}`)
                }}
                className={`flex items-center justify-center gap-1 rounded-xl px-2 py-2.5 text-sm font-semibold transition-all ${
                  language === opt.id
                    ? "bg-gradient-to-br from-[#8b6f47] to-[#a07d50] text-white shadow-md"
                    : "bg-muted text-foreground hover:bg-muted/80"
                }`}
              >
                {language === opt.id && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                <span>{opt.native}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Menu Groups */}
      {menuGroups.map((group, groupIdx) => (
        <div
          key={groupIdx}
          className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
        >
          {group.map((item, idx) => {
            const Icon = item.icon
            return (
              <button
                key={idx}
                onClick={item.onClick}
                className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/40 active:bg-muted/60 ${
                  idx !== group.length - 1 ? "border-b border-border/60" : ""
                }`}
              >
                <div
                  className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${item.iconBg}`}
                >
                  <Icon className={`h-4.5 w-4.5 ${item.iconColor}`} strokeWidth={2.2} />
                </div>
                <span className="flex-1 text-sm font-medium text-foreground">{item.label}</span>
                {item.badge !== undefined && (
                  <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
                {item.rightText && (
                  <span className="text-xs text-muted-foreground">{item.rightText}</span>
                )}
                <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground/60" />
              </button>
            )
          })}
        </div>
      ))}

      {/* Logout (standalone danger item) */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <button
          onClick={handleLogout}
          disabled={isLogoutLoading}
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-red-500/5 active:bg-red-500/10 disabled:opacity-60"
        >
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-red-500/10">
            {isLogoutLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-red-600" />
            ) : (
              <LogOut className="h-4 w-4 text-red-600" strokeWidth={2.2} />
            )}
          </div>
          <span className="flex-1 text-sm font-semibold text-red-600">
            {t("customer", "logout")}
          </span>
          <ChevronRight className="h-4 w-4 flex-shrink-0 text-red-600/60" />
        </button>
      </div>

      {/* Version footer */}
      <p className="mt-2 mb-2 text-center text-[11px] text-muted-foreground/60">
        JP&Co · v1.0
      </p>
    </div>
  )
}
