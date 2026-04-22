import { getQuotes } from '@/lib/yahooFinance'
import type { QuoteResult } from '@/lib/yahooFinance'
import type { PriceMap } from '@/lib/portfolio'

// Fetch quotes for a list of symbols, keyed by symbol. Empty list short-circuits.
export async function fetchPrices(symbols: string[]): Promise<PriceMap> {
  if (symbols.length === 0) return {}
  const quotes: QuoteResult[] = await getQuotes(symbols)
  const map: PriceMap = {}
  for (const q of quotes) {
    map[q.symbol] = q
  }
  return map
}
