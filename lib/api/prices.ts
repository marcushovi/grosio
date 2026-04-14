import { getQuotes } from '../yahooFinance'
import type { QuoteResult } from '../yahooFinance'
import type { PriceMap } from '../portfolio'

export type { PriceMap }

/**
 * Fetch current quotes for a list of symbols and return them keyed by symbol.
 *
 * Called as a TanStack Query `queryFn` — the Query cache handles staleness;
 * this function just does the Edge Function round-trip and shapes the result.
 * Returns an empty map for an empty symbol list so callers don't need to
 * guard the call site.
 */
export async function fetchPrices(symbols: string[]): Promise<PriceMap> {
  if (symbols.length === 0) return {}
  const quotes: QuoteResult[] = await getQuotes(symbols)
  const map: PriceMap = {}
  for (const q of quotes) {
    map[q.symbol] = q
  }
  return map
}
