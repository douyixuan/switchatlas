import { getAllSwitchesFlat } from '@/lib/data'
import { Gallery } from '@/components/gallery'

export const dynamic = 'force-static'

export default function GalleryPage() {
  const switches = getAllSwitchesFlat().map((sw) => ({
    slug: sw.slug,
    name: sw.name,
    vendor: sw.vendor,
    type: sw.type,
    force: sw.force,
    travel: sw.travel,
    image: sw.image,
  }))

  return <Gallery switches={switches} />
}
