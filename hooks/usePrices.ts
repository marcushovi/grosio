import { useCallback } from 'react'
import { getCached, setCache } from '../lib/cache'
import { getQuotes, QuoteResult } from '../lib/yahooFinance'

export type PriceMap = Record<string, QuoteResult>

export function usePrices() {
  const fetchPrices = useCallback(async (symbols: string[]): Promise<PriceMap> => {
    if (symbols.length === 0) return {}

    const result: PriceMap = {}
    const uncached: string[] = []

    for (const symbol of symbols) {
      const cached = await getCached<QuoteResult>(`quote_${symbol}`)
      if (cached) {
        result[symbol] = cached
      } else {
        uncached.push(symbol)
      }
    }

    if (uncached.length > 0) {
      const quotes = await getQuotes(uncached)
      for (const quote of quotes) {
        result[quote.symbol] = quote
        await setCache(`quote_${quote.symbol}`, quote)
      }
    }

    return result
  }, [])

  return { fetchPrices }
}
