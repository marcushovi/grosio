import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { getQuotes, QuoteResult } from '../lib/yahooFinance'

export type PriceMap = Record<string, QuoteResult>

export function usePrices() {
  const queryClient = useQueryClient()

  const fetchPrices = useCallback(
    async (symbols: string[]): Promise<PriceMap> => {
      if (symbols.length === 0) return {}

      const result: PriceMap = {}
      const uncached: string[] = []

      for (const symbol of symbols) {
        // Let React Query handle the caching layer instead of manual AsyncStorage
        const cached = queryClient.getQueryData<QuoteResult>(['quote', symbol])
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
          queryClient.setQueryData(['quote', quote.symbol], quote)
        }
      }

      return result
    },
    [queryClient]
  )

  return { fetchPrices }
}
