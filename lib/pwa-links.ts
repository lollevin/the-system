const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://jpandco.cloud"

export function getPwaLink(view: string, params?: Record<string, string>): string {
  const url = new URL("/pwa", BASE_URL)
  url.searchParams.set("view", view)
  if (params) {
    for (const [key, val] of Object.entries(params)) {
      url.searchParams.set(key, val)
    }
  }
  return url.toString()
}

export function getVoucherLink(code: string): string {
  return getPwaLink("vouchers", { code })
}

export function getPointsLink(): string {
  return getPwaLink("home")
}

export function getMenuLink(): string {
  return getPwaLink("menu")
}

export function getReferralLink(refCode: string): string {
  const url = new URL("/login", BASE_URL)
  url.searchParams.set("ref", refCode)
  return url.toString()
}

export function getSmartLinks(context: {
  hasVoucher?: boolean
  voucherCode?: string
  isVip?: boolean
  isBirthday?: boolean
  isInactive?: boolean
  isNewCustomer?: boolean
}): string {
  const lines: string[] = []

  if (context.hasVoucher && context.voucherCode) {
    lines.push(`🎫 Claim voucher: ${getVoucherLink(context.voucherCode)}`)
  }

  if (context.isBirthday || context.isVip || context.isInactive) {
    lines.push(`📱 View points & rewards: ${getPointsLink()}`)
  }

  if (context.isInactive || context.isNewCustomer) {
    lines.push(`🍽️ See our menu: ${getMenuLink()}`)
  }

  if (!context.hasVoucher && !context.isInactive && !context.isBirthday) {
    lines.push(`📱 Check your rewards: ${getPointsLink()}`)
  }

  return lines.join("\n")
}
