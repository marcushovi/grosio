import i18n from './i18n'

export type DisplayCurrency = 'EUR' | 'USD' | 'CZK'

export interface ExchangeRates {
  eurUsd: number // 1 EUR = X USD
  eurCzk: number // 1 EUR = X CZK
  timestamp: number
}

let memCache: ExchangeRates | null = null
const CACHE_TTL_MS = 60 * 60 * 1000

const LOCALE_MAP: Record<string, string> = {
  en: 'en-US',
  sk: 'sk-SK',
  cs: 'cs-CZ',
  de: 'de-DE',
}

function getLocale(): string {
  return LOCALE_MAP[i18n.language] ?? 'en-US'
}

export async function getExchangeRates(): Promise<ExchangeRates> {
  const now = Date.now()
  if (memCache && now - memCache.timestamp < CACHE_TTL_MS) {
    return memCache
  }
  try {
    const res = await fetch('https://api.frankfurter.app/latest?from=EUR&to=USD,CZK')
    if (!res.ok) throw new Error('Frankfurter fetch failed')
    const data = await res.json()
    const rates: ExchangeRates = {
      eurUsd: data.rates?.USD ?? 1.08,
      eurCzk: data.rates?.CZK ?? 25.3,
      timestamp: now,
    }
    memCache = rates
    return rates
  } catch {
    return memCache ?? { eurUsd: 1.08, eurCzk: 25.3, timestamp: 0 }
  }
}

/** Convert a position value from its original currency to EUR (base).
 *  Only EUR and USD are supported — other currencies pass through as-is
 *  (treated as EUR). This is a known limitation. */
export function toEur(amount: number, currency: string, rates: ExchangeRates): number {
  if (currency === 'EUR') return amount
  if (currency === 'USD') return amount / rates.eurUsd
  // Unsupported currency — treat as EUR (best-effort)
  return amount
}

/** Convert an EUR amount to the display currency */
export function convertToDisplay(
  amountEur: number,
  displayCurrency: DisplayCurrency,
  rates: ExchangeRates
): number {
  switch (displayCurrency) {
    case 'EUR':
      return amountEur
    case 'USD':
      return amountEur * rates.eurUsd
    case 'CZK':
      return amountEur * rates.eurCzk
  }
}

export function currencySymbol(currency: DisplayCurrency | string): string {
  switch (currency) {
    case 'EUR':
      return '€'
    case 'USD':
      return '$'
    case 'CZK':
      return 'Kč'
    default:
      return currency
  }
}

/** Format amount with locale-aware number formatting and currency symbol */
export function formatAmount(amount: number, displayCurrency: DisplayCurrency): string {
  return new Intl.NumberFormat(getLocale(), {
    style: 'currency',
    currency: displayCurrency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/** Format gain/loss with sign prefix and percentage */
export function formatGainLoss(
  value: number,
  pct: number,
  displayCurrency: DisplayCurrency
): string {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${formatAmount(value, displayCurrency)} (${sign}${pct.toFixed(2)}%)`
}

/** Format a raw price in its original currency (not converted) */
export function formatRaw(amount: number, originalCurrency: string): string {
  const validCurrencies = ['EUR', 'USD', 'CZK', 'GBP', 'CHF', 'JPY', 'CAD', 'AUD']
  const cur = validCurrencies.includes(originalCurrency) ? originalCurrency : 'USD'
  return new Intl.NumberFormat(getLocale(), {
    style: 'currency',
    currency: cur,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}
