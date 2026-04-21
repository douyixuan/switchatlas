import { getAllVendors, getSwitchesByVendor } from '@/lib/data'
import { VendorContent } from '@/components/vendor-content'

export async function generateStaticParams() {
  return getAllVendors().map((vendor) => ({ vendor }))
}

export default async function VendorPage({
  params,
}: {
  params: Promise<{ vendor: string }>
}) {
  const { vendor } = await params
  const decodedVendor = decodeURIComponent(vendor)
  const switches = getSwitchesByVendor(decodedVendor)

  return <VendorContent decodedVendor={decodedVendor} switches={switches} />
}
