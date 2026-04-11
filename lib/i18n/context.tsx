'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
import en from './dictionaries/en.json'
import zh from './dictionaries/zh.json'

export type Locale = 'en' | 'zh'

type Dictionary = Record<string, string>

const dictionaries: Record<Locale, Dictionary> = { en, zh }

interface LocaleContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: 'en',
  setLocale: () => {},
})

const STORAGE_KEY = 'switchatlas-locale'

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en')

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'zh') {
      setLocaleState('zh')
    }
  }, [])

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next)
    localStorage.setItem(STORAGE_KEY, next)
    document.documentElement.lang = next === 'zh' ? 'zh-CN' : 'en'
  }, [])

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      {children}
    </LocaleContext.Provider>
  )
}

export function useLocale() {
  return useContext(LocaleContext)
}

export function useT() {
  const { locale } = useLocale()
  const dict = dictionaries[locale]

  return useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      let value = dict[key] ?? dictionaries.en[key] ?? key
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          value = value.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v))
        }
      }
      return value
    },
    [dict]
  )
}
