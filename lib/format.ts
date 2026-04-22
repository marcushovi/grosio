// Centralised date / number / currency / percent formatting bound to the app
// language. Two intentional deviations from Intl defaults across all locales:
//   1. Currency code/symbol always follows the number (`1,234.56 USD`, never
//      `$1,234.56`) so EUR/USD/CZK columns line up.
//   2. Percent has a NBSP before `%` in sk/cs/de but no space in en.

export type AppCurrency = 'EUR' | 'USD' | 'CZK'

const INTL_LOCALE: Record<string, string> = {
  en: 'en-US',
  sk: 'sk-SK',
  cs: 'cs-CZ',
  de: 'de-DE',
}

// Single source of truth for currency display.
//   `symbol` — picker labels ("$ US Dollar"), visually rich.
//   `code`   — money amounts ("1,234.56 USD"), aligned across currencies.
export const CURRENCY_DISPLAY: Record<AppCurrency, { symbol: string; code: string }> = {
  EUR: { symbol: '€', code: 'EUR' },
  USD: { symbol: '$', code: 'USD' },
  CZK: { symbol: 'Kč', code: 'CZK' },
}

export function currencySymbol(currency: AppCurrency): string {
  return CURRENCY_DISPLAY[currency].symbol
}

export function currencyCode(currency: AppCurrency): string {
  return CURRENCY_DISPLAY[currency].code
}

// U+00A0 — keep number and symbol on the same line.
const NBSP = ' '

function getLocale(lang: string): string {
  return INTL_LOCALE[lang] ?? 'en-US'
}

function toDate(d: Date | string): Date {
  if (d instanceof Date) return d
  // Bare YYYY-MM-DD parses as local midnight (not UTC) to avoid day shifts
  // for users in negative-UTC offsets.
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return new Date(`${d}T00:00:00`)
  return new Date(d)
}

export interface NumberFormatOptions {
  minimumFractionDigits?: number
  maximumFractionDigits?: number
}

export interface PercentFormatOptions extends NumberFormatOptions {
  // Prepend `+` for non-negative values. Default true (PnL convention).
  signed?: boolean
  // If true, value is already in percent units (44.8 → "+44,80 %").
  // Default false — value is a ratio (0.448 → "+44,80 %").
  asPercent?: boolean
}

export function formatDate(date: Date | string, lang: string): string {
  return new Intl.DateTimeFormat(getLocale(lang), { dateStyle: 'short' }).format(toDate(date))
}

export function formatTime(date: Date | string, lang: string): string {
  return new Intl.DateTimeFormat(getLocale(lang), {
    hour: 'numeric',
    minute: '2-digit',
  }).format(toDate(date))
}

export function formatDateTime(date: Date | string, lang: string): string {
  return new Intl.DateTimeFormat(getLocale(lang), {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(toDate(date))
}

export function formatNumber(value: number, lang: string, options?: NumberFormatOptions): string {
  return new Intl.NumberFormat(getLocale(lang), {
    minimumFractionDigits: options?.minimumFractionDigits ?? 2,
    maximumFractionDigits: options?.maximumFractionDigits ?? 2,
  }).format(value)
}

export function formatCurrency(
  value: number,
  currency: AppCurrency,
  lang: string,
  options?: NumberFormatOptions
): string {
  return `${formatNumber(value, lang, options)}${NBSP}${currencyCode(currency)}`
}

export function formatPercent(value: number, lang: string, options?: PercentFormatOptions): string {
  const signed = options?.signed ?? true
  const asPercent = options?.asPercent ?? false
  const percent = asPercent ? value : value * 100
  const formatted = formatNumber(percent, lang, {
    minimumFractionDigits: options?.minimumFractionDigits ?? 2,
    maximumFractionDigits: options?.maximumFractionDigits ?? 2,
  })
  const sign = signed && percent >= 0 ? '+' : ''
  return lang === 'en' ? `${sign}${formatted}%` : `${sign}${formatted}${NBSP}%`
}

export function formatSignedCurrency(
  value: number,
  currency: AppCurrency,
  lang: string,
  options?: NumberFormatOptions
): string {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${formatCurrency(value, currency, lang, options)}`
}

// Local-time YYYY-MM-DD for wire format (DB / API). Do NOT use for display —
// `formatDate` handles locale-aware presentation.
export function toYyyyMmDd(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}
