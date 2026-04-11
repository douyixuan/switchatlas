'use client'

import type { ForceCurvePoint } from '@/lib/types'
import { useT } from '@/lib/i18n/context'

export function ForceCurveChart({ data }: { data: ForceCurvePoint[] }) {
  const t = useT()

  if (!data.length) return null

  const width = 600
  const height = 300
  const padding = { top: 20, right: 20, bottom: 40, left: 50 }

  const plotW = width - padding.left - padding.right
  const plotH = height - padding.top - padding.bottom

  const maxForce = Math.max(...data.map((d) => d.force), 1)
  const maxDisplacement = Math.max(...data.map((d) => d.displacement), 1)

  const scaleX = (v: number) => padding.left + (v / maxDisplacement) * plotW
  const scaleY = (v: number) => padding.top + plotH - (v / maxForce) * plotH

  const pathD = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'}${scaleX(d.displacement).toFixed(1)},${scaleY(d.force).toFixed(1)}`)
    .join(' ')

  const yTicks = Array.from({ length: 5 }, (_, i) => Math.round((maxForce / 4) * i))
  const xTicks = Array.from({ length: 5 }, (_, i) => +((maxDisplacement / 4) * i).toFixed(1))

  return (
    <div
      className="overflow-hidden rounded-standard p-4"
      style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" aria-label={t('chart.ariaLabel')}>
        {yTicks.map((tick) => (
          <g key={`y-${tick}`}>
            <line
              x1={padding.left}
              y1={scaleY(tick)}
              x2={width - padding.right}
              y2={scaleY(tick)}
              stroke="var(--border-subtle)"
              strokeWidth="1"
            />
            <text
              x={padding.left - 8}
              y={scaleY(tick)}
              textAnchor="end"
              dominantBaseline="middle"
              fill="var(--text-muted)"
              fontSize="10"
              fontFamily="var(--font-family-mono)"
            >
              {tick}g
            </text>
          </g>
        ))}

        {xTicks.map((tick) => (
          <text
            key={`x-${tick}`}
            x={scaleX(tick)}
            y={height - 8}
            textAnchor="middle"
            fill="var(--text-muted)"
            fontSize="10"
            fontFamily="var(--font-family-mono)"
          >
            {tick}mm
          </text>
        ))}

        <path d={pathD} fill="none" stroke="#18E299" strokeWidth="2" strokeLinejoin="round" />

        <text
          x={width / 2}
          y={height - 2}
          textAnchor="middle"
          fill="var(--text-muted)"
          fontSize="11"
          fontFamily="var(--font-family-sans)"
        >
          {t('chart.xAxis')}
        </text>
        <text
          x={12}
          y={height / 2}
          textAnchor="middle"
          fill="var(--text-muted)"
          fontSize="11"
          fontFamily="var(--font-family-sans)"
          transform={`rotate(-90, 12, ${height / 2})`}
        >
          {t('chart.yAxis')}
        </text>
      </svg>
    </div>
  )
}
