'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useT } from '@/lib/i18n/context'

export function ImageGallery({
  images,
  name,
}: {
  images: string[]
  name: string
}) {
  const [selected, setSelected] = useState(0)
  const t = useT()

  if (images.length <= 1) {
    return (
      <div className="overflow-hidden rounded-lg">
        <Image
          src={images[0] || '/images/default-switch.svg'}
          alt={name}
          width={400}
          height={400}
          className="h-auto w-full rounded-lg object-cover"
        />
      </div>
    )
  }

  return (
    <div>
      <div className="relative overflow-hidden rounded-lg">
        {images.map((src, i) => (
          <Image
            key={src}
            src={src}
            alt={`${name} — ${i + 1}`}
            width={400}
            height={400}
            className={`h-auto w-full rounded-lg object-cover transition-opacity duration-300 ${
              i === selected
                ? 'relative opacity-100'
                : 'absolute inset-0 opacity-0'
            }`}
            priority={i === 0}
          />
        ))}
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {images.map((src, i) => (
          <button
            key={src}
            onClick={() => setSelected(i)}
            className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-md transition-all ${
              i === selected
                ? 'ring-2 ring-brand ring-offset-1'
                : 'opacity-60 hover:opacity-100'
            }`}
            style={{
              border: i === selected ? 'none' : '1px solid var(--border-subtle)',
            }}
            aria-label={t('imageGallery.viewImage', { n: i + 1 })}
          >
            <Image
              src={src}
              alt=""
              fill
              className="object-cover"
              sizes="64px"
            />
          </button>
        ))}
      </div>
    </div>
  )
}
