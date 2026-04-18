import { getAllSwitches, getVendorsWithImages } from '@/lib/data'
import { HomeContent } from '@/components/home-content'

export const dynamic = 'force-static'

export default function HomePage() {
  const featured = getAllSwitches(3)
  const vendors = getVendorsWithImages()

  return <HomeContent featured={featured} vendors={vendors} />
}
