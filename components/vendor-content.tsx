'use client'

import Link from 'next/link'
import { useT } from '@/lib/i18n/context'
import { SwitchCard } from '@/components/switch-card'
import type { Switch } from '@/lib/types'

export function VendorContent({
  decodedVendor,
  switches,
}: {
  decodedVendor: string
  switches: Switch[]
}) {
  const t = useT()

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
              {switches.length}
            </span>
            {t('vendor.switches')}
          </span>
        </p>
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {switches.map((sw) => (
          <SwitchCard key={sw.slug} sw={sw} />
        ))}
      </div>
    </div>
  )
}
