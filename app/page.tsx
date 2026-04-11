import { getAllSwitches, getAllVendors } from '@/lib/data'
import { Hero } from '@/components/hero'
import { SwitchCard } from '@/components/switch-card'
import Link from 'next/link'

export const dynamic = 'force-static'

export default function HomePage() {
  const featured = getAllSwitches(3)
  const vendors = getAllVendors()

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
          Featured Switches
        </h2>
        <p
          className="mt-3 text-body-lg"
          style={{ color: 'var(--text-muted)' }}
        >
          A curated selection from top manufacturers.
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
            Browse by Vendor
          </h2>
          <p
            className="mt-3 text-body-lg"
            style={{ color: 'var(--text-muted)' }}
          >
            Explore switches from {vendors.length} manufacturers.
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
