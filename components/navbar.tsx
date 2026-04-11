'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ThemeToggle } from './theme-toggle'
import { LanguageSwitcher } from './language-switcher'
import { useT } from '@/lib/i18n/context'

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const t = useT()

  return (
    <header
      className="sticky top-0 z-40 w-full backdrop-blur-xl"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--bg-primary) 85%, transparent)',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      <nav className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <span
            className="text-card-title font-semibold tracking-tight"
            style={{ color: 'var(--text-primary)' }}
          >
            Switch<span className="text-brand">Atlas</span>
          </span>
        </Link>

        <div className="flex items-center gap-1">
          <div className="hidden items-center gap-1 md:flex">
            <Link
              href="/gallery"
              className="rounded-md px-3 py-1.5 text-link font-medium transition-colors hover:text-brand"
              style={{ color: 'var(--text-primary)' }}
            >
              {t('nav.gallery')}
            </Link>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md px-3 py-1.5 text-link font-medium transition-colors hover:text-brand"
              style={{ color: 'var(--text-primary)' }}
            >
              {t('nav.github')}
            </a>
          </div>

          <LanguageSwitcher />
          <ThemeToggle />

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="ml-1 inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors md:hidden"
            style={{ color: 'var(--text-primary)' }}
            aria-label={t('nav.toggleMenu')}
          >
            {menuOpen ? (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M4 4l8 8M12 4l-8 8" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M2 4h12M2 8h12M2 12h12" />
              </svg>
            )}
          </button>
        </div>
      </nav>

      {menuOpen && (
        <div
          className="border-t px-6 py-3 md:hidden"
          style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-primary)' }}
        >
          <Link
            href="/gallery"
            className="block rounded-md px-3 py-2 text-link font-medium transition-colors hover:text-brand"
            style={{ color: 'var(--text-primary)' }}
            onClick={() => setMenuOpen(false)}
          >
            {t('nav.gallery')}
          </Link>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-md px-3 py-2 text-link font-medium transition-colors hover:text-brand"
            style={{ color: 'var(--text-primary)' }}
            onClick={() => setMenuOpen(false)}
          >
            {t('nav.github')}
          </a>
        </div>
      )}
    </header>
  )
}
