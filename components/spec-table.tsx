import type { Switch } from '@/lib/types'

function Row({ label, value }: { label: string; value: string | number | undefined }) {
  const display = value === undefined || value === '' || value === 0 ? 'N/A' : String(value)
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
  return (
    <table className="w-full">
      <tbody>
        <Row label="Type" value={sw.type !== 'Unknown' ? sw.type : undefined} />
        <Row label="Actuation Force" value={sw.force.actuation > 0 ? `${sw.force.actuation}g` : undefined} />
        <Row label="Bottom-out Force" value={sw.force.bottom_out > 0 ? `${sw.force.bottom_out}g` : undefined} />
        <Row label="Actuation Travel" value={sw.travel.actuation > 0 ? `${sw.travel.actuation}mm` : undefined} />
        <Row label="Total Travel" value={sw.travel.total > 0 ? `${sw.travel.total}mm` : undefined} />
        <Row label="Sound" value={sw.sound} />
        <Row label="Color" value={sw.color} />
        {sw.mount && <Row label="Mount" value={sw.mount} />}
      </tbody>
    </table>
  )
}
