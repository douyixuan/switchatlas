import { getAllSwitches, getAllVendors } from '@/lib/data'
import { HomeContent } from '@/components/home-content'

export const dynamic = 'force-static'

export default function HomePage() {
  const featured = getAllSwitches(3)
  const vendors = getAllVendors()

  return <HomeContent featured={featured} vendors={vendors} />
}
