const EDGE_FUNCTION_URL = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/yahoo-finance`
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY!

export interface QuoteResult {
  symbol: string
  price: number
  currency: string
  change: number
  changePercent: number
  name: string
}

export async function getQuote(symbol: string): Promise<QuoteResult | null> {
  try {
    const res = await fetch(
      `${EDGE_FUNCTION_URL}?action=quote&symbol=${encodeURIComponent(symbol)}`,
      { headers: { Authorization: `Bearer ${SUPABASE_KEY}` } }
    )
    if (!res.ok) return null
    const data = await res.json()
    return data?.quote ?? null
  } catch {
    return null
  }
}

export async function getQuotes(symbols: string[]): Promise<QuoteResult[]> {
  if (symbols.length === 0) return []
  try {
    const res = await fetch(`${EDGE_FUNCTION_URL}?action=quotes&q=${symbols.join(',')}`, {
      headers: { Authorization: `Bearer ${SUPABASE_KEY}` },
    })
    if (!res.ok) return []
    const data = await res.json()
    return Object.values(data?.quotes ?? {}) as QuoteResult[]
  } catch {
    return []
  }
}

export async function searchSymbols(
  query: string
): Promise<Array<{ symbol: string; name: string; exchange: string; type: string }>> {
  try {
    const res = await fetch(`${EDGE_FUNCTION_URL}?action=search&q=${encodeURIComponent(query)}`, {
      headers: { Authorization: `Bearer ${SUPABASE_KEY}` },
    })
    if (!res.ok) return []
    const data = await res.json()
    return data?.quotes ?? []
  } catch {
    return []
  }
}
