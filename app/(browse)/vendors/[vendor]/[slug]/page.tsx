import { getAllVendors, getSwitchesByVendor, getSwitchBySlug } from '@/lib/data'
import { Badge } from '@/components/badge'
import { SpecTable } from '@/components/spec-table'
import { ForceCurveChart } from '@/components/force-curve-chart'
import { ImageGallery } from '@/components/image-gallery'
import Link from 'next/link'

export async function generateStaticParams() {
  const vendors = getAllVendors()
  const params: { vendor: string; slug: string }[] = []

  for (const vendor of vendors) {
    const switches = getSwitchesByVendor(vendor)
    for (const sw of switches) {
      params.push({ vendor, slug: sw.slug })
    }
  }

  return params
}

export default async function SwitchDetailPage({
  params,
}: {
  params: Promise<{ vendor: string; slug: string }>
}) {
  const { vendor, slug } = await params
  const decodedVendor = decodeURIComponent(vendor)
  const sw = getSwitchBySlug(decodedVendor, slug)

  if (!sw) {
    return (
      <div className="py-20 text-center">
        <h1 className="text-section font-semibold" style={{ color: 'var(--text-primary)' }}>
          Switch Not Found
        </h1>
        <Link href={`/vendors/${vendor}`} className="mt-4 inline-block text-brand hover:underline">
          ← Back to {decodedVendor}
        </Link>
      </div>
    )
  }

  return (
    <div>
      <Link
        href={`/vendors/${vendor}`}
        className="text-caption font-medium transition-colors hover:text-brand"
        style={{ color: 'var(--text-muted)' }}
      >
        ← {decodedVendor}
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
            by {sw.vendor}
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
            Gallery Mode
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
                Force Curve
              </h2>
              <ForceCurveChart data={sw.forceCurveData} />
            </div>
          )}

          {sw.bodyHtml && (
            <div
              className="prose prose-gray mt-8 max-w-none"
              style={{ color: 'var(--text-secondary)' }}
              dangerouslySetInnerHTML={{ __html: sw.bodyHtml }}
            />
          )}
        </div>
      </div>
    </div>
  )
}
