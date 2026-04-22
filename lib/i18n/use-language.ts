"use client"

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react"
import { type Language, translations, t as translate } from "./translations"

const LANGUAGE_KEY = "jpco_language"
const LOCALE_COOKIE = "jpco_locale"

// Map internal short code -> IETF tag used by the backend / LLM
export const LOCALE_TAG: Record<Language, string> = {
  en: "en-US",
  zh: "zh-CN",
  ms: "ms-MY",
}

// ===== Context-based language system =====
// All components share the SAME language state via React Context.
// When language changes in Settings, every component updates instantly.
// The cookie mirror allows API route handlers to read the authoritative
// locale on the server side, eliminating "async revert to default" bugs.

interface LanguageContextType {
  language: Language
  locale: string // IETF tag, e.g. "zh-CN"
  languageRef: React.MutableRefObject<Language> // always-fresh ref for async closures
  setLanguage: (lang: Language) => void
  t: (category: keyof typeof translations, key: string) => string
  isLoaded: boolean
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

function writeLocaleCookie(lang: Language) {
  try {
    // 1 year, site-wide, readable by server route handlers
    document.cookie = `${LOCALE_COOKIE}=${LOCALE_TAG[lang]}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`
  } catch {}
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en")
  const [isLoaded, setIsLoaded] = useState(false)
  const languageRef = useRef<Language>("en")

  // Load saved language from localStorage on mount and seed the cookie
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LANGUAGE_KEY) as Language | null
      if (saved === "en" || saved === "zh" || saved === "ms") {
        setLanguageState(saved)
        languageRef.current = saved
        writeLocaleCookie(saved)
      } else {
        writeLocaleCookie("en")
      }
    } catch {}
    setIsLoaded(true)
  }, [])

  // Atomic update: state + ref + localStorage + cookie
  // so every async path (handlers, fetches, SSR) sees the same value.
  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang)
    languageRef.current = lang
    try { localStorage.setItem(LANGUAGE_KEY, lang) } catch {}
    writeLocaleCookie(lang)
  }, [])

  // Translation helper reads from the ref so async callbacks that
  // call t() after a language switch see the fresh locale.
  const t = useCallback(
    (category: keyof typeof translations, key: string): string =>
      translate(category, key, languageRef.current),
    [language] // re-bind on re-render so re-renders still pick up state changes
  )

  const value: LanguageContextType = {
    language,
    locale: LOCALE_TAG[language],
    languageRef,
    setLanguage,
    t,
    isLoaded,
  }

  return React.createElement(LanguageContext.Provider, { value }, children)
}

// Strict consumer — throws when used outside the provider.
// (The earlier fallback branch violated Rules of Hooks and silently
//  served "en" during the first render of any orphan component.)
export function useLanguage(): LanguageContextType {
  const ctx = useContext(LanguageContext)
  if (!ctx) {
    throw new Error(
      "useLanguage() must be used inside <LanguageProvider>. Check components/providers.tsx wiring."
    )
  }
  return ctx
}

// Export for direct use
export type { Language }
export { translations }
