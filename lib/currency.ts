import i18n from './i18n'
import type { PositionCurrency } from '../types'

export type DisplayCurrency = 'EUR' | 'USD' | 'CZK'

export interface ExchangeRates {
  eurUsd: number // 1 EUR = X USD
  eurCzk: number // 1 EUR = X CZK
  timestamp: number
}

const LOCALE_MAP: Record<string, string> = {
  en: 'en-US',
  sk: 'sk-SK',
  cs: 'cs-CZ',
  de: 'de-DE',
}

function getLocale(): string {
  return LOCALE_MAP[i18n.language] ?? 'en-US'
}

/** Pure fetch — no internal caching. Callers wrap with TanStack Query
 *  (`queryKeys.exchangeRates.latest()`, `staleTime: 1h`) so there's a single
 *  cache layer the rest of the data layer can observe and invalidate. */
export async function getExchangeRates(): Promise<ExchangeRates> {
  try {
    const res = await fetch('https://api.frankfurter.app/latest?from=EUR&to=USD,CZK')
    if (!res.ok) throw new Error('Frankfurter fetch failed')
    const data = await res.json()
    return {
      eurUsd: data.rates?.USD ?? 1.08,
      eurCzk: data.rates?.CZK ?? 25.3,
      timestamp: Date.now(),
    }
  } catch {
    // Surface as "fallback" rates (timestamp: 0). UI checks via
    // `areFallbackRates` and renders a banner when they're shown.
    return { eurUsd: 1.08, eurCzk: 25.3, timestamp: 0 }
  }
}

/** Did `getExchangeRates` fall back to its hardcoded defaults?
 *  True when the network call failed and no cached rates were available. */
export function areFallbackRates(rates: ExchangeRates): boolean {
  return rates.timestamp === 0
}

/** Convert a position value from its original currency to EUR (base).
 *  Exhaustive over `PositionCurrency` — any broader string is rejected at the
 *  type level, eliminating the "silently treat GBP as EUR" footgun. */
export function toEur(amount: number, currency: PositionCurrency, rates: ExchangeRates): number {
  switch (currency) {
    case 'EUR':
      return amount
    case 'USD':
      return amount / rates.eurUsd
    case 'CZK':
      return amount / rates.eurCzk
  }
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
