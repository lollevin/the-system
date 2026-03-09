"use client"

import { DollarSign, Users, Sparkles, Bot, BarChart3, Megaphone } from "lucide-react"

interface Icon3DProps {
  type: "dollar" | "users" | "sparkles" | "bot" | "chart" | "campaign"
  size?: number
}

const iconConfig = {
  dollar: {
    icon: DollarSign,
    bgColor: "bg-emerald-500/20",
    iconColor: "text-emerald-400",
  },
  users: {
    icon: Users,
    bgColor: "bg-blue-500/20",
    iconColor: "text-blue-400",
  },
  sparkles: {
    icon: Sparkles,
    bgColor: "bg-amber-500/20",
    iconColor: "text-amber-400",
  },
  bot: {
    icon: Bot,
    bgColor: "bg-amber-500/20",
    iconColor: "text-amber-400",
  },
  chart: {
    icon: BarChart3,
    bgColor: "bg-purple-500/20",
    iconColor: "text-purple-400",
  },
  campaign: {
    icon: Megaphone,
    bgColor: "bg-pink-500/20",
    iconColor: "text-pink-400",
  },
}

export function Icon3D({ type, size = 48 }: Icon3DProps) {
  const config = iconConfig[type]
  const IconComponent = config.icon
  const iconSize = Math.floor(size * 0.5)

  return (
    <div 
      className={`flex items-center justify-center rounded-xl ${config.bgColor}`}
      style={{ width: size, height: size }}
    >
      <IconComponent className={config.iconColor} size={iconSize} />
    </div>
  )
}

export function LargeBotIcon() {
  return (
    <div className="h-24 w-24 flex items-center justify-center rounded-2xl bg-amber-500/20">
      <Bot className="text-amber-400" size={48} />
    </div>
  )
}
