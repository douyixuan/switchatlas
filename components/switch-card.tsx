'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Badge } from './badge'
import { useT } from '@/lib/i18n/context'
import type { Switch } from '@/lib/types'

export function SwitchCard({ sw }: { sw: Switch }) {
  const t = useT()

  return (
    <Link
      href={`/vendors/${sw.vendor}/${sw.slug}`}
      className="card-hover group block overflow-hidden rounded-standard"
    >
      <div
        className="relative aspect-[4/3] overflow-hidden"
        style={{ backgroundColor: 'var(--bg-card)' }}
      >
        <Image
          src={sw.image}
          alt={sw.name}
          fill
          className="object-contain p-8 transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
      </div>
      <div className="p-5">
        <div className="mb-2.5 flex items-center gap-2">
          <Badge type={sw.type} />
        </div>
        <h3
          className="text-card-title font-semibold"
          style={{
            color: 'var(--text-primary)',
            letterSpacing: '-0.2px',
          }}
        >
          {sw.name}
        </h3>
        <p
          className="mt-1 text-caption"
          style={{ color: 'var(--text-muted)' }}
        >
          {sw.vendor}
        </p>
        {sw.force.actuation > 0 && (
          <p
            className="mt-2.5 font-mono text-mono uppercase tracking-wider"
            style={{ color: 'var(--text-muted)' }}
          >
            {t('card.stats', {
              force: sw.force.actuation,
              travel: sw.travel.total > 0 ? `${sw.travel.total}mm` : t('common.na'),
            })}
          </p>
        )}
      </div>
    </Link>
  )
}
