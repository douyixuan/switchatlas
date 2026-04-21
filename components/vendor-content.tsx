'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useT } from '@/lib/i18n/context'
import { SwitchCard } from '@/components/switch-card'
import type { Switch } from '@/lib/types'

const SWITCH_TYPES = ['All', 'Linear', 'Tactile', 'Clicky'] as const
type TypeFilter = (typeof SWITCH_TYPES)[number]

export function VendorContent({
  decodedVendor,
  switches,
}: {
  decodedVendor: string
  switches: Switch[]
}) {
  const t = useT()
  const [activeType, setActiveType] = useState<TypeFilter>('All')

  const filteredSwitches = activeType === 'All'
    ? switches
    : switches.filter((sw) => sw.type === activeType)

  return (
    <div>
      <div className="mb-8">
        <Link
          href="/"
          className="text-caption font-medium transition-colors hover:text-brand"
          style={{ color: 'var(--text-muted)' }}
        >
          {t('vendor.backHome')}
        </Link>
        <h1
          className="mt-3 text-section font-semibold"
          style={{
            color: 'var(--text-primary)',
            letterSpacing: '-0.8px',
            lineHeight: '1.10',
          }}
        >
          {decodedVendor}
        </h1>
        <p className="mt-2 text-body" style={{ color: 'var(--text-muted)' }}>
          <span className="inline-flex items-center gap-1.5">
            <span className="rounded-pill bg-brand-light px-2.5 py-0.5 font-mono text-mono font-semibold text-brand-deep">
              {filteredSwitches.length}
            </span>
            {t('vendor.switches')}
          </span>
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {SWITCH_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => setActiveType(type)}
              className={`rounded-pill px-3 py-1 font-mono text-mono font-semibold uppercase tracking-wider transition-colors ${
                activeType === type
                  ? 'bg-brand-light text-brand-deep'
                  : 'border text-caption font-medium hover:text-brand'
              }`}
              style={
                activeType !== type
                  ? { borderColor: 'var(--border)', color: 'var(--text-muted)' }
                  : undefined
              }
            >
              {t(`type.${type}`)}
            </button>
          ))}
        </div>
      </div>
      {filteredSwitches.length === 0 ? (
        <p className="py-12 text-center text-body" style={{ color: 'var(--text-muted)' }}>
          {t('vendor.noSwitchesWithImages')}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredSwitches.map((sw) => (
            <SwitchCard key={sw.slug} sw={sw} />
          ))}
        </div>
      )}
    </div>
  )
}
