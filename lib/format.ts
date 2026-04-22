/**
 * Centralized date, time, number, currency, and percent formatting.
 *
 * All formatters accept the app's i18n language code (`en` | `sk` | `cs` | `de`)
 * and internally map to an Intl locale. Two deliberate deviations from Intl
 * defaults apply across all locales for visual consistency:
 *
 * 1. Currency symbol/code always follows the number (e.g. `1,234.56 USD`,
 *    not `$1,234.56`). We use `Intl.NumberFormat` with `style: 'decimal'`
 *    and append the symbol ourselves.
 * 2. Percent sign is spaced in sk/cs/de (`44,80 %`) and unspaced in en
 *    (`44.80%`). Intl's native percent style is inconsistent about this
 *    across locales, so we format a decimal and append the sign manually.
 */

export type AppCurrency = 'EUR' | 'USD' | 'CZK'

const INTL_LOCALE: Record<string, string> = {
  en: 'en-US',
  sk: 'sk-SK',
  cs: 'cs-CZ',
  de: 'de-DE',
}

// Single source of truth for currency display. Two views:
//  - `symbol`: used in pickers / selectors ("$ US Dollar") — visually rich.
//  - `code`:   used in money amounts ("1,234.56 USD") — deliberately the ISO
//    code for USD so amounts stack visually with `€` / `Kč` in a column, for
//    an app whose primary audience is SK/CZ.
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

// U+00A0 non-breaking space so the amount and its symbol never wrap apart.
const NBSP = ' '

function getLocale(lang: string): string {
  return INTL_LOCALE[lang] ?? 'en-US'
}

function toDate(d: Date | string): Date {
  if (d instanceof Date) return d
  // Parse bare 'YYYY-MM-DD' as local midnight (not UTC) so dates don't shift
  // by a day for users in negative-UTC offsets. Anything else falls through
  // to Date's native parser.
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return new Date(`${d}T00:00:00`)
  return new Date(d)
}

export interface NumberFormatOptions {
  minimumFractionDigits?: number
  maximumFractionDigits?: number
}

export interface PercentFormatOptions extends NumberFormatOptions {
  /** Prepend `+` for non-negative values. Default true (PnL convention). Set
   *  false for non-signed percent displays like allocation. */
  signed?: boolean
  /** If `true`, `value` is already in percent units (44.8 → "+44,80 %").
   *  Default `false` — `value` is a ratio (0.448 → "+44,80 %"). */
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

export function formatSignedNumber(
  value: number,
  lang: string,
  options?: NumberFormatOptions
): string {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${formatNumber(value, lang, options)}`
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

/** Wire-format date converter — used when writing to DB or calling the API.
 *  Produces a local-timezone YYYY-MM-DD string. Do NOT use for display;
 *  use `formatDate` instead. */
export function toYyyyMmDd(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}
