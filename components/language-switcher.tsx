'use client'

import { useLocale, type Locale } from '@/lib/i18n/context'

const options: { value: Locale; label: string }[] = [
  { value: 'en', label: 'EN' },
  { value: 'zh', label: '中' },
]

export function LanguageSwitcher() {
  const { locale, setLocale } = useLocale()

  return (
    <div className="inline-flex items-center rounded-md" role="radiogroup">
      {options.map(({ value, label }) => (
        <button
          key={value}
          role="radio"
          aria-checked={locale === value}
          onClick={() => setLocale(value)}
          className={`px-2 py-1 text-caption font-medium transition-colors ${
            locale === value
              ? 'text-brand'
              : ''
          }`}
          style={locale !== value ? { color: 'var(--text-muted)' } : undefined}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
