const EDGE_FUNCTION_URL = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/yahoo-finance`
const API_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY ?? ''

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
    const headers = { Authorization: `Bearer ${API_KEY}`, apikey: API_KEY }
    const res = await fetch(
      `${EDGE_FUNCTION_URL}?action=quote&symbol=${encodeURIComponent(symbol)}`,
      { headers }
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
    const headers = { Authorization: `Bearer ${API_KEY}`, apikey: API_KEY }
    const res = await fetch(`${EDGE_FUNCTION_URL}?action=quotes&q=${symbols.join(',')}`, {
      headers,
    })
    if (!res.ok) return []
    const data = await res.json()
    return Object.values(data?.quotes ?? {}) as QuoteResult[]
  } catch {
    return []
  }
}

export interface HistoricalQuote {
  date: string // 'YYYY-MM-DD'
  close: number
}

export interface SymbolHistory {
  symbol: string
  currency: string
  quotes: HistoricalQuote[]
}

export async function getHistory(
  symbols: string[],
  interval: '1wk' | '1mo' | '1d' = '1wk',
  range: '1y' | '6mo' | '3mo' = '1y'
): Promise<SymbolHistory[]> {
  if (symbols.length === 0) return []
  try {
    const headers = { Authorization: `Bearer ${API_KEY}`, apikey: API_KEY }
    const res = await fetch(
      `${EDGE_FUNCTION_URL}?action=history&q=${symbols.join(',')}&interval=${interval}&range=${range}`,
      { headers }
    )
    if (!res.ok) return []
    const data = await res.json()
    return data?.history ?? []
  } catch {
    return []
  }
}

export async function searchSymbols(
  query: string
): Promise<Array<{ symbol: string; name: string; exchange: string; type: string }>> {
  try {
    const headers = { Authorization: `Bearer ${API_KEY}`, apikey: API_KEY }
    const res = await fetch(`${EDGE_FUNCTION_URL}?action=search&q=${encodeURIComponent(query)}`, {
      headers,
    })
    if (!res.ok) return []
    const data = await res.json()
    return data?.quotes ?? []
  } catch {
    return []
  }
}
