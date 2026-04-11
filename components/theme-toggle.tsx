'use client'

import { useEffect, useState } from 'react'
import { useT } from '@/lib/i18n/context'

export function ThemeToggle() {
  const [dark, setDark] = useState(false)
  const [mounted, setMounted] = useState(false)
  const t = useT()

  useEffect(() => {
    setMounted(true)
    setDark(document.documentElement.classList.contains('dark'))
  }, [])

  const toggle = () => {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('switchatlas-theme', next ? 'dark' : 'light')
  }

  if (!mounted) {
    return (
      <button
        className="inline-flex h-8 w-8 items-center justify-center rounded-md"
        aria-label={t('theme.toggle')}
      >
        <div className="h-4 w-4" />
      </button>
    )
  }

  return (
    <button
      onClick={toggle}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-gray-100"
      aria-label={dark ? t('theme.lightMode') : t('theme.darkMode')}
      style={{ color: 'var(--text-primary)' }}
    >
      {dark ? (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="8" cy="8" r="3" />
          <path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3.05 3.05l1.06 1.06M11.89 11.89l1.06 1.06M3.05 12.95l1.06-1.06M11.89 4.11l1.06-1.06" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 8.5A6 6 0 017.5 2 6 6 0 1014 8.5z" />
        </svg>
      )}
    </button>
  )
}
