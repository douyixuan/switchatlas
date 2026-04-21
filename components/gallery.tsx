'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useT } from '@/lib/i18n/context'

interface GallerySwitch {
  slug: string
  name: string
  vendor: string
  type: string
  force: { actuation: number; bottom_out: number }
  travel: { actuation: number; total: number }
  image: string
  images: string[]
}

const SWITCH_TYPES = ['All', 'Linear', 'Tactile', 'Clicky'] as const
type TypeFilter = (typeof SWITCH_TYPES)[number]

export function Gallery({ switches }: { switches: GallerySwitch[] }) {
  const router = useRouter()
  const t = useT()
  const [current, setCurrent] = useState(0)
  const [imageIdx, setImageIdx] = useState(0)
  const [transitioning, setTransitioning] = useState(false)
  const [activeType, setActiveType] = useState<TypeFilter>('All')
  const touchRef = useRef<{ startX: number; startY: number } | null>(null)
  const hasInitialized = useRef(false)

  const filteredSwitches = activeType === 'All'
    ? switches
    : switches.filter((sw) => sw.type === activeType)

  const handleTypeChange = (type: TypeFilter) => {
    setActiveType(type)
    setCurrent(0)
    setImageIdx(0)
  }

  useEffect(() => {
    if (hasInitialized.current) return
    hasInitialized.current = true
    const hash = window.location.hash.slice(1)
    if (!hash) return
    const idx = switches.findIndex(
      (s) => `${s.vendor}/${s.slug}` === decodeURIComponent(hash)
    )
    if (idx >= 0) setCurrent(idx)
  }, [switches])

  const navigateSwitch = useCallback(
    (dir: 1 | -1) => {
      if (transitioning) return
      setTransitioning(true)
      setTimeout(() => {
        setCurrent((prev) => {
          const next = prev + dir
          if (next < 0) return filteredSwitches.length - 1
          if (next >= filteredSwitches.length) return 0
          return next
        })
        setImageIdx(0)
        setTransitioning(false)
      }, 180)
    },
    [transitioning, filteredSwitches.length]
  )

  const navigateImage = useCallback(
    (dir: 1 | -1) => {
      const sw = filteredSwitches[current]
      if (!sw || sw.images.length <= 1) return
      setImageIdx((prev) => {
        const next = prev + dir
        if (next < 0) return sw.images.length - 1
        if (next >= sw.images.length) return 0
        return next
      })
    },
    [current, filteredSwitches]
  )

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') navigateSwitch(-1)
      else if (e.key === 'ArrowRight') navigateSwitch(1)
      else if (e.key === 'ArrowUp') { e.preventDefault(); navigateImage(-1) }
      else if (e.key === 'ArrowDown') { e.preventDefault(); navigateImage(1) }
      else if (e.key === 'Escape') router.back()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [navigateSwitch, navigateImage, router])

  const onTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    touchRef.current = { startX: touch.clientX, startY: touch.clientY }
  }

  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchRef.current) return
    const touch = e.changedTouches[0]
    const dx = touch.clientX - touchRef.current.startX
    const dy = touch.clientY - touchRef.current.startY
    touchRef.current = null

    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
      navigateSwitch(dx < 0 ? 1 : -1)
    } else if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 50) {
      navigateImage(dy < 0 ? 1 : -1)
    }
  }

  const sw = filteredSwitches[current]
  if (!sw) return null

  const prevIdx = current === 0 ? filteredSwitches.length - 1 : current - 1
  const nextIdx = current === filteredSwitches.length - 1 ? 0 : current + 1
  const displayImage = sw.images[imageIdx] || sw.image
  const hasMultipleImages = sw.images.length > 1

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ backgroundColor: '#0d0d0d', touchAction: 'none' }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="flex items-center justify-between px-6 py-4">
        <button
          onClick={() => router.back()}
          className="rounded-pill border px-4 py-1.5 text-caption font-medium text-white/70 transition-colors hover:text-white"
          style={{ borderColor: 'rgba(255,255,255,0.12)' }}
        >
          {t('gallery.exit')}
        </button>

        <div className="flex items-center gap-1.5">
          {SWITCH_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => handleTypeChange(type)}
              className={`rounded-pill px-3 py-1 font-mono text-mono font-semibold uppercase tracking-wider transition-colors ${
                activeType === type
                  ? 'bg-brand-light text-brand-deep'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              {t(`type.${type}`)}
            </button>
          ))}
        </div>

        <span className="font-mono text-mono uppercase tracking-wider text-white/40">
          {current + 1} / {filteredSwitches.length}
        </span>
      </div>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        <button
          onClick={() => navigateSwitch(-1)}
          className="absolute left-0 top-0 z-10 flex h-full w-16 items-center justify-center text-white/0 transition-colors hover:text-white/60 md:w-28"
          aria-label={t('gallery.prevSwitch')}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        <div
          className={`flex max-w-xl flex-col items-center px-16 transition-opacity duration-180 ${
            transitioning ? 'opacity-0' : 'opacity-100'
          }`}
        >
          <div className="relative h-56 w-56 sm:h-72 sm:w-72 md:h-80 md:w-80">
            <Image
              key={displayImage}
              src={displayImage}
              alt={sw.name}
              fill
              className="object-contain drop-shadow-2xl"
              sizes="320px"
              priority
            />
          </div>

          {hasMultipleImages && (
            <div className="mt-4 flex items-center gap-1.5">
              {sw.images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setImageIdx(i)}
                  className={`h-1.5 rounded-full transition-all ${
                    i === imageIdx
                      ? 'w-4 bg-brand'
                      : 'w-1.5 bg-white/25 hover:bg-white/40'
                  }`}
                  aria-label={t('gallery.imageN', { n: i + 1 })}
                />
              ))}
            </div>
          )}

          <h2
            className="mt-8 text-center text-subheading font-semibold text-white sm:text-section"
            style={{ letterSpacing: '-0.8px', lineHeight: '1.15' }}
          >
            {sw.name}
          </h2>
          <p className="mt-2 text-body text-white/40">{sw.vendor}</p>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <span className="rounded-pill bg-brand-light px-3 py-1 font-mono text-mono font-semibold uppercase tracking-wider text-brand-deep">
              {t(`type.${sw.type}`)}
            </span>
            {sw.force.actuation > 0 && (
              <span className="font-mono text-mono uppercase tracking-wider text-white/30">
                {t('card.stats', {
                  force: sw.force.actuation,
                  travel: sw.travel.total > 0 ? `${sw.travel.total}mm` : t('common.na'),
                })}
              </span>
            )}
          </div>

          <Link
            href={`/vendors/${sw.vendor}/${sw.slug}`}
            className="mt-6 rounded-pill border border-white/10 px-5 py-1.5 text-caption font-medium text-brand transition-all hover:border-brand/30 hover:bg-brand/5"
          >
            {t('gallery.viewDetails')}
          </Link>
        </div>

        <button
          onClick={() => navigateSwitch(1)}
          className="absolute right-0 top-0 z-10 flex h-full w-16 items-center justify-center text-white/0 transition-colors hover:text-white/60 md:w-28"
          aria-label={t('gallery.nextSwitch')}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>

      <div className="hidden">
        <Image src={filteredSwitches[prevIdx].image} alt="" width={1} height={1} priority />
        <Image src={filteredSwitches[nextIdx].image} alt="" width={1} height={1} priority />
      </div>
    </div>
  )
}
