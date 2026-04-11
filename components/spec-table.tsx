'use client'

import type { Switch } from '@/lib/types'
import { useT } from '@/lib/i18n/context'

function Row({ label, value }: { label: string; value: string | number | undefined }) {
  const t = useT()
  const display = value === undefined || value === '' || value === 0 ? t('common.na') : String(value)
  return (
    <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
      <td
        className="py-2.5 pr-4 font-mono text-mono uppercase tracking-wider"
        style={{ color: 'var(--text-muted)' }}
      >
        {label}
      </td>
      <td className="py-2.5 text-body font-medium" style={{ color: 'var(--text-primary)' }}>
        {display}
      </td>
    </tr>
  )
}

export function SpecTable({ sw }: { sw: Switch }) {
  const t = useT()

  return (
    <table className="w-full">
      <tbody>
        <Row label={t('spec.type')} value={sw.type !== 'Unknown' ? t(`type.${sw.type}`) : undefined} />
        <Row label={t('spec.actuationForce')} value={sw.force.actuation > 0 ? `${sw.force.actuation}g` : undefined} />
        <Row label={t('spec.bottomOutForce')} value={sw.force.bottom_out > 0 ? `${sw.force.bottom_out}g` : undefined} />
        <Row label={t('spec.actuationTravel')} value={sw.travel.actuation > 0 ? `${sw.travel.actuation}mm` : undefined} />
        <Row label={t('spec.totalTravel')} value={sw.travel.total > 0 ? `${sw.travel.total}mm` : undefined} />
        <Row label={t('spec.sound')} value={sw.sound} />
        <Row label={t('spec.color')} value={sw.color} />
        {sw.mount && <Row label={t('spec.mount')} value={sw.mount} />}
      </tbody>
    </table>
  )
}
