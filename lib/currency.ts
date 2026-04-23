import type { PositionCurrency } from '@/types'

export type DisplayCurrency = 'EUR' | 'USD' | 'CZK'

export interface ExchangeRates {
  eurUsd: number
  eurCzk: number
}

// Pure fetch — no internal caching. Caller wraps with TanStack Query.
// Throws on network / parse failure so the enclosing query surfaces an error
// state rather than silently rendering stale numbers.
export async function getExchangeRates(): Promise<ExchangeRates> {
  const res = await fetch('https://api.frankfurter.app/latest?from=EUR&to=USD,CZK')
  if (!res.ok) throw new Error(`Frankfurter fetch failed: ${res.status}`)
  const data = await res.json()
  const eurUsd = data?.rates?.USD
  const eurCzk = data?.rates?.CZK
  if (typeof eurUsd !== 'number' || typeof eurCzk !== 'number') {
    throw new Error('Frankfurter response missing USD/CZK rates')
  }
  return { eurUsd, eurCzk }
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
