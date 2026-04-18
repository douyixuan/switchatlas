import { getAllVendors, getSwitchesByVendor, getSwitchBySlug } from '@/lib/data'
import { SwitchDetailContent } from '@/components/switch-detail-content'

export async function generateStaticParams() {
  const vendors = getAllVendors()
  const params: { vendor: string; slug: string }[] = []

  for (const vendor of vendors) {
    const switches = getSwitchesByVendor(vendor, undefined, { includeImageless: true })
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

  return (
    <SwitchDetailContent
      sw={sw}
      vendor={vendor}
      decodedVendor={decodedVendor}
    />
  )
}
