import type { PositionCurrency } from '@/types'

export type DisplayCurrency = 'EUR' | 'USD' | 'CZK'

export interface ExchangeRates {
  eurUsd: number
  eurCzk: number
}

const FRANKFURTER_URL = process.env.EXPO_PUBLIC_FRANKFURTER_URL

// Pure fetch — caller wraps with TanStack Query. Throws on failure so the
// query surfaces an error rather than silently rendering stale numbers.
export async function getExchangeRates(): Promise<ExchangeRates> {
  if (!FRANKFURTER_URL) throw new Error('EXPO_PUBLIC_FRANKFURTER_URL not set')

  const res = await fetch(FRANKFURTER_URL)
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
