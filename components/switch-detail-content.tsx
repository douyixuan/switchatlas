'use client'

import Link from 'next/link'
import { useT, useLocale } from '@/lib/i18n/context'
import { Badge } from '@/components/badge'
import { SpecTable } from '@/components/spec-table'
import { ForceCurveChart } from '@/components/force-curve-chart'
import { ImageGallery } from '@/components/image-gallery'
import type { SwitchDetail } from '@/lib/types'

export function SwitchDetailContent({
  sw,
  vendor,
  decodedVendor,
}: {
  sw: SwitchDetail | null
  vendor: string
  decodedVendor: string
}) {
  const t = useT()
  const { locale } = useLocale()

  if (!sw) {
    return (
      <div className="py-20 text-center">
        <h1 className="text-section font-semibold" style={{ color: 'var(--text-primary)' }}>
          {t('detail.notFound')}
        </h1>
        <Link href={`/vendors/${vendor}`} className="mt-4 inline-block text-brand hover:underline">
          {t('detail.backTo', { vendor: decodedVendor })}
        </Link>
      </div>
    )
  }

  const bodyHtml = locale === 'zh' && sw.bodyHtmlZh ? sw.bodyHtmlZh : sw.bodyHtml

  return (
    <div>
      <Link
        href={`/vendors/${vendor}`}
        className="text-caption font-medium transition-colors hover:text-brand"
        style={{ color: 'var(--text-muted)' }}
      >
        {t('detail.back', { vendor: decodedVendor })}
      </Link>

      <div className="mt-6 flex flex-col gap-10 lg:flex-row">
        <div className="shrink-0 lg:w-[400px]">
          <ImageGallery images={sw.images} name={sw.name} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <Badge type={sw.type} />
            {sw.sound && (
              <span
                className="font-mono text-mono uppercase tracking-wider"
                style={{ color: 'var(--text-muted)' }}
              >
                {sw.sound}
              </span>
            )}
          </div>

          <h1
            className="mt-3 text-section font-semibold"
            style={{
              color: 'var(--text-primary)',
              letterSpacing: '-0.8px',
              lineHeight: '1.10',
            }}
          >
            {sw.name}
          </h1>

          <p className="mt-1 text-body-lg" style={{ color: 'var(--text-muted)' }}>
            {t('detail.by', { vendor: sw.vendor })}
          </p>

          <Link
            href={`/gallery#${encodeURIComponent(sw.vendor + '/' + sw.slug)}`}
            className="mt-4 inline-flex items-center gap-2 rounded-pill border px-4 py-1.5 text-caption font-medium transition-all hover:border-brand/30 hover:text-brand"
            style={{
              color: 'var(--text-muted)',
              borderColor: 'var(--border-medium)',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="1" width="14" height="14" rx="2" />
              <path d="M1 5h14M5 1v14" />
            </svg>
            {t('detail.galleryMode')}
          </Link>

          <div className="mt-6">
            <SpecTable sw={sw} />
          </div>

          {sw.forceCurveData && sw.forceCurveData.length > 0 && (
            <div className="mt-8">
              <h2
                className="mb-4 text-subheading font-medium"
                style={{ color: 'var(--text-primary)', letterSpacing: '-0.24px' }}
              >
                {t('detail.forceCurve')}
              </h2>
              <ForceCurveChart data={sw.forceCurveData} />
            </div>
          )}

          {bodyHtml && (
            <div
              className="prose prose-gray mt-8 max-w-none"
              style={{ color: 'var(--text-secondary)' }}
              dangerouslySetInnerHTML={{ __html: bodyHtml }}
            />
          )}
        </div>
      </div>
    </div>
  )
}
