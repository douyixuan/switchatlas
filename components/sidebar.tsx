'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { useT } from '@/lib/i18n/context'

export function Sidebar({ vendors }: { vendors: string[] }) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const t = useT()

  const currentVendor = vendors.find((v) => pathname?.startsWith(`/vendors/${v}`))

  return (
    <>
      {/* Mobile vendor selector */}
      <div className="mb-6 md:hidden">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex w-full items-center justify-between rounded-standard px-4 py-3 text-caption font-medium"
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-primary)',
          }}
        >
          <span>{currentVendor || t('sidebar.selectVendor')}</span>
          <svg
            width="16" height="16" viewBox="0 0 16 16" fill="none"
            stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
            className={`transition-transform ${mobileOpen ? 'rotate-180' : ''}`}
          >
            <path d="M4 6l4 4 4-4" />
          </svg>
        </button>
        {mobileOpen && (
          <div
            className="mt-2 rounded-standard p-2"
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              boxShadow: 'var(--shadow-card-val)',
            }}
          >
            {vendors.map((vendor) => {
              const isActive = pathname?.startsWith(`/vendors/${vendor}`)
              return (
                <Link
                  key={vendor}
                  href={`/vendors/${vendor}`}
                  className={`block rounded-md px-3 py-2 text-caption font-medium transition-colors ${
                    isActive
                      ? 'bg-brand-light text-brand-deep'
                      : ''
                  }`}
                  style={!isActive ? { color: 'var(--text-secondary)' } : undefined}
                  onClick={() => setMobileOpen(false)}
                >
                  {vendor}
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden w-56 shrink-0 md:block">
        <div className="sticky top-[72px] space-y-0.5 pr-4">
          <p
            className="mb-3 font-mono text-micro font-medium uppercase tracking-wider"
            style={{ color: 'var(--text-muted)' }}
          >
            {t('sidebar.vendors')}
          </p>
          {vendors.map((vendor) => {
            const isActive = pathname?.startsWith(`/vendors/${vendor}`)
            return (
              <Link
                key={vendor}
                href={`/vendors/${vendor}`}
                className={`block rounded-md px-3 py-1.5 text-caption font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-light text-brand-deep'
                    : 'hover:bg-gray-50'
                }`}
                style={!isActive ? { color: 'var(--text-secondary)' } : undefined}
              >
                {vendor}
              </Link>
            )
          })}
        </div>
      </aside>
    </>
  )
}
