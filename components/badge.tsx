'use client'

import { useT } from '@/lib/i18n/context'

const typeColors: Record<string, { bg: string; text: string }> = {
  Linear: { bg: 'bg-brand-light', text: 'text-brand-deep' },
  Tactile: { bg: 'bg-amber-100', text: 'text-amber-800' },
  Clicky: { bg: 'bg-blue-100', text: 'text-blue-800' },
  Unknown: { bg: 'bg-gray-100', text: 'text-gray-500' },
}

export function Badge({ type }: { type: string }) {
  const t = useT()
  const colors = typeColors[type] || typeColors.Unknown
  return (
    <span
      className={`inline-block rounded-pill px-3 py-0.5 font-mono text-micro font-semibold uppercase tracking-wider ${colors.bg} ${colors.text}`}
    >
      {t(`type.${type}`)}
    </span>
  )
}
