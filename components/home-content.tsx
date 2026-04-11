'use client'

import Link from 'next/link'
import { useT } from '@/lib/i18n/context'
import { Hero } from '@/components/hero'
import { SwitchCard } from '@/components/switch-card'
import type { Switch } from '@/lib/types'

export function HomeContent({
  featured,
  vendors,
}: {
  featured: Switch[]
  vendors: string[]
}) {
  const t = useT()

  return (
    <>
      <Hero />

      <div className="mx-auto max-w-7xl px-6 py-16 md:py-24">
        <h2
          className="text-section font-semibold"
          style={{
            color: 'var(--text-primary)',
            letterSpacing: '-0.8px',
            lineHeight: '1.10',
          }}
        >
          {t('home.featured')}
        </h2>
        <p
          className="mt-3 text-body-lg"
          style={{ color: 'var(--text-muted)' }}
        >
          {t('home.featuredDesc')}
        </p>
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((sw) => (
            <SwitchCard key={`${sw.vendor}-${sw.slug}`} sw={sw} />
          ))}
        </div>

        <div className="mt-20">
          <h2
            className="text-section font-semibold"
            style={{
              color: 'var(--text-primary)',
              letterSpacing: '-0.8px',
              lineHeight: '1.10',
            }}
          >
            {t('home.browseByVendor')}
          </h2>
          <p
            className="mt-3 text-body-lg"
            style={{ color: 'var(--text-muted)' }}
          >
            {t('home.vendorCount', { count: vendors.length })}
          </p>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {vendors.map((vendor) => (
              <Link
                key={vendor}
                href={`/vendors/${vendor}`}
                className="group rounded-standard p-6 text-center transition-all duration-200 hover:-translate-y-0.5"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <span
                  className="text-card-title font-semibold transition-colors group-hover:text-brand"
                  style={{ color: 'var(--text-primary)', letterSpacing: '-0.2px' }}
                >
                  {vendor}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
