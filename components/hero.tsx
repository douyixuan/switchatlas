'use client'

import Link from 'next/link'
import { useT } from '@/lib/i18n/context'

export function Hero() {
  const t = useT()

  return (
    <section className="relative overflow-hidden">
      <div
        className="absolute inset-0"
        style={{ background: 'var(--hero-gradient)' }}
      />
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background: 'radial-gradient(circle at 20% 80%, rgba(24, 226, 153, 0.08) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(24, 226, 153, 0.06) 0%, transparent 50%)',
        }}
      />

      <div className="relative mx-auto max-w-4xl px-6 pb-20 pt-24 text-center md:pb-28 md:pt-36">
        <div className="animate-fade-in">
          <p
            className="mb-4 font-mono text-mono font-medium uppercase tracking-wider"
            style={{ color: 'var(--text-muted)' }}
          >
            {t('hero.eyebrow')}
          </p>
          <h1
            className="text-section font-semibold md:text-display"
            style={{
              color: 'var(--text-primary)',
              letterSpacing: '-1.28px',
              lineHeight: '1.1',
            }}
          >
            {t('hero.title1')}{' '}
            <span className="text-brand">{t('hero.title2')}</span>
          </h1>
        </div>

        <p
          className="mx-auto mt-6 max-w-2xl animate-slide-up text-body-lg"
          style={{
            color: 'var(--text-muted)',
            lineHeight: '1.6',
          }}
        >
          {t('hero.description')}
        </p>

        <div className="mt-10 flex animate-slide-up flex-wrap items-center justify-center gap-4">
          <Link
            href="/vendors/Gateron"
            className="inline-flex items-center rounded-pill px-7 py-2.5 text-button font-medium text-white shadow-button transition-opacity hover:opacity-90"
            style={{ backgroundColor: 'var(--text-primary)' }}
          >
            {t('hero.getStarted')}
          </Link>
          <Link
            href="/gallery"
            className="inline-flex items-center rounded-pill border px-7 py-2.5 text-button font-medium transition-all hover:opacity-90"
            style={{
              color: 'var(--text-primary)',
              borderColor: 'var(--border-medium)',
              backgroundColor: 'var(--bg-card)',
            }}
          >
            {t('hero.galleryMode')}
          </Link>
        </div>
      </div>
    </section>
  )
}
