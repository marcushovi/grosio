import type { PositionCurrency } from '@/types'

export type DisplayCurrency = 'EUR' | 'USD' | 'CZK'

export interface ExchangeRates {
  eurUsd: number
  eurCzk: number
  timestamp: number
}

// Pure fetch — no internal caching. Caller wraps with TanStack Query.
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
    // Hardcoded fallback. UI renders a banner via `areFallbackRates`.
    return { eurUsd: 1.08, eurCzk: 25.3, timestamp: 0 }
  }
}

export function areFallbackRates(rates: ExchangeRates): boolean {
  return rates.timestamp === 0
}

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

// Reexport so legacy importers (CurrencyPicker, settings) still resolve.
export { currencySymbol } from '@/lib/format'
