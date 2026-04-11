import { getAllVendors } from '@/lib/data'
import { Sidebar } from '@/components/sidebar'

export default function BrowseLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const vendors = getAllVendors()

  return (
    <div className="mx-auto max-w-7xl px-6 py-6 md:py-8">
      <div className="flex gap-8">
        <Sidebar vendors={vendors} />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  )
}
