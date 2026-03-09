"use client"

import { useLanguage } from "@/lib/i18n"

export function PageHeader({ titleKey, descKey, category = "admin" }: {
  titleKey: string
  descKey: string
  category?: string
}) {
  const { t } = useLanguage()
  return (
    <div>
      <h1 className="text-2xl font-bold">{t(category as any, titleKey)}</h1>
      {descKey && <p className="text-muted-foreground">{t(category as any, descKey)}</p>}
    </div>
  )
}

export function T({ k, c = "admin" }: { k: string; c?: string }) {
  const { t } = useLanguage()
  return <>{t(c as any, k)}</>
}
