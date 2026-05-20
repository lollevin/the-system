"use client"

import { useState } from "react"
import {
  ChevronRight,
  Bell,
  Headphones,
  UserCog,
  LogOut,
  Globe,
  Loader2,
  Check,
  Camera,
  Star,
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

  const totalSpent = profile.total_spent || 0
  const memberTier =
    totalSpent >= 5000 ? "Diamond"
    : totalSpent >= 3000 ? "Gold"
    : totalSpent >= 1000 ? "Silver"
    : "Bronze"

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

  return (
    <div className="flex flex-col gap-4 px-4 py-3">

      {/* ── Profile Banner Card ── */}
      <div
        className="relative overflow-hidden rounded-3xl shadow-md"
        style={{ background: "linear-gradient(135deg, #fdf6ec 0%, #edd9b0 100%)" }}
      >
        {/* Decorative right side — real food photo */}
        <div className="absolute right-0 top-0 bottom-0 w-36 pointer-events-none select-none">
          {/* gradient fade from left so text stays readable */}
          <div className="absolute inset-y-0 left-0 w-10 z-10"
            style={{ background: "linear-gradient(to right, #fdf6ec, transparent)" }} />
          <img
            src="/images/drink-1.jpg"
            alt=""
            className="h-full w-full object-cover object-center opacity-90"
          />
          <div className="absolute bottom-2 right-3 z-20">
            <span className="text-[10px] font-extrabold text-white/80 tracking-widest drop-shadow">JP&Co</span>
          </div>
        </div>

        <div className="relative p-5 pr-36">
          {/* Avatar with camera */}
          <div className="relative inline-block mb-3">
            <div className="w-[72px] h-[72px] rounded-full bg-gray-200 flex items-center justify-center text-[28px] font-bold text-gray-500 ring-2 ring-white/60">
              {initial}
            </div>
            <button
              onClick={onEditProfile}
              className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-[#8b6f47] flex items-center justify-center shadow-md hover:bg-[#7a5f3a] active:scale-95 transition-all"
            >
              <Camera className="w-3 h-3 text-white" />
            </button>
          </div>

          {/* Name */}
          <h2 className="text-[22px] font-extrabold text-gray-900 leading-tight tracking-tight">
            {profile.full_name || "Member"}
          </h2>

          {/* Phone */}
          {phone && (
            <p className="text-sm text-gray-600 mt-0.5">{phone}</p>
          )}

          {/* Tier badge */}
          <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-[#8b6f47] px-3.5 py-1.5">
            <Star className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
            <span className="text-xs font-bold text-white">{memberTier} Member</span>
          </div>

          {/* Edit Profile button */}
          <button
            onClick={onEditProfile}
            className="mt-2.5 flex items-center gap-1 rounded-full border border-gray-400/40 bg-white/80 px-4 py-1.5 text-xs font-semibold text-gray-800 backdrop-blur-sm hover:bg-white active:scale-95 transition-all"
          >
            {t("customer", "editProfile")}
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Language Picker (expands inline) */}
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

      {/* Main Menu Group */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {[
          {
            icon: UserCog,
            label: t("customer", "profileSettings"),
            desc: "Manage your personal information",
            onClick: onEditProfile,
            iconColor: "text-blue-600",
            iconBg: "bg-blue-500/10",
            badge: undefined as number | undefined,
          },
          {
            icon: Bell,
            label: t("customer", "notificationSettings"),
            desc: "Manage your notifications and preferences",
            onClick: onShowNotifications,
            iconColor: "text-amber-600",
            iconBg: "bg-amber-500/10",
            badge: notificationCount > 0 ? notificationCount : undefined,
          },
          {
            icon: Headphones,
            label: t("customer", "contactSupport"),
            desc: "Get help and support from our team",
            onClick: onShowSupport,
            iconColor: "text-violet-600",
            iconBg: "bg-violet-500/10",
            badge: undefined as number | undefined,
          },
        ].map((item, idx, arr) => {
          const Icon = item.icon
          return (
            <button
              key={idx}
              onClick={item.onClick}
              className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/40 active:bg-muted/60 ${
                idx !== arr.length - 1 ? "border-b border-border/60" : ""
              }`}
            >
              <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${item.iconBg}`}>
                <Icon className={`h-5 w-5 ${item.iconColor}`} strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{item.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
              </div>
              {item.badge !== undefined && (
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              )}
              <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground/60" />
            </button>
          )
        })}
      </div>

      {/* Change Language */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <button
          onClick={() => setShowLangPicker((v) => !v)}
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/40 active:bg-muted/60"
        >
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-teal-500/10">
            <Globe className="h-5 w-5 text-teal-600" strokeWidth={2} />
          </div>
          <span className="flex-1 text-sm font-semibold text-foreground">{t("customer", "changeLanguage")}</span>
          <span className="text-xs text-muted-foreground">{currentLangLabel}</span>
          <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground/60" />
        </button>
      </div>

      {/* Logout */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <button
          onClick={handleLogout}
          disabled={isLogoutLoading}
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-red-500/5 active:bg-red-500/10 disabled:opacity-60"
        >
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-500/10">
            {isLogoutLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-red-600" />
            ) : (
              <LogOut className="h-5 w-5 text-red-600" strokeWidth={2} />
            )}
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-600">{t("customer", "logout")}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Sign out from your account</p>
          </div>
          <ChevronRight className="h-4 w-4 flex-shrink-0 text-red-600/60" />
        </button>
      </div>

      {/* Version footer */}
      <p className="mt-2 mb-4 text-center text-[11px] text-muted-foreground/60">
        JP&Co · v1.0
      </p>
    </div>
  )
}
