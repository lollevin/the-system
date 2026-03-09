"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from "react"
import { type Language, translations, t as translate } from "./translations"

const LANGUAGE_KEY = "jpco_language"

// ===== Context-based language system =====
// All components share the SAME language state via React Context.
// When language changes in Settings, every component updates instantly.

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (category: keyof typeof translations, key: string) => string
  isLoaded: boolean
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en")
  const [isLoaded, setIsLoaded] = useState(false)

  // Load saved language from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LANGUAGE_KEY) as Language | null
      if (saved && (saved === "en" || saved === "zh" || saved === "ms")) {
        setLanguageState(saved)
      }
    } catch {}
    setIsLoaded(true)
  }, [])

  // Save language to localStorage and update shared state
  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang)
    try {
      localStorage.setItem(LANGUAGE_KEY, lang)
    } catch {}
  }, [])

  // Translation helper - shared across all consumers
  const t = useCallback(
    (category: keyof typeof translations, key: string): string => {
      return translate(category, key, language)
    },
    [language]
  )

  return React.createElement(
    LanguageContext.Provider,
    { value: { language, setLanguage, t, isLoaded } },
    children
  )
}

// Hook that reads from context (shared state)
export function useLanguage() {
  const context = useContext(LanguageContext)

  // If no provider found (e.g. server component or outside provider),
  // fall back to standalone state (reads from localStorage on mount)
  const [fallbackLang, setFallbackLangState] = useState<Language>("en")
  const [fallbackLoaded, setFallbackLoaded] = useState(false)

  useEffect(() => {
    if (!context) {
      try {
        const saved = localStorage.getItem(LANGUAGE_KEY) as Language | null
        if (saved && (saved === "en" || saved === "zh" || saved === "ms")) {
          setFallbackLangState(saved)
        }
      } catch {}
      setFallbackLoaded(true)
    }
  }, [context])

  const setFallbackLang = useCallback((lang: Language) => {
    setFallbackLangState(lang)
    try { localStorage.setItem(LANGUAGE_KEY, lang) } catch {}
  }, [])

  const fallbackT = useCallback(
    (category: keyof typeof translations, key: string): string => {
      return translate(category, key, fallbackLang)
    },
    [fallbackLang]
  )

  // If context is available, use it (shared state). Otherwise use fallback.
  if (context) {
    return context
  }

  return {
    language: fallbackLang,
    setLanguage: setFallbackLang,
    t: fallbackT,
    isLoaded: fallbackLoaded,
  }
}

// Export for direct use
export type { Language }
export { translations }
