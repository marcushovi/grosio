import { supabase } from './supabase'

const EDGE_FUNCTION_URL = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/yahoo-finance`
const ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY ?? ''

/**
 * Build auth headers for Supabase Edge Function calls.
 *
 * Uses the logged-in user's session access_token as the Bearer so the Supabase
 * gateway (with verify_jwt enabled) accepts the request as an authenticated
 * user rather than an anonymous caller. `apikey` is still the anon key —
 * that header is for project routing/rate-limiting, not identity.
 *
 * Returns `null` if there is no active session. Callers should short-circuit
 * in that case — the app's auth guard redirects to /login when the session is
 * missing, so these fetches shouldn't run in that state anyway.
 */
async function authHeaders(): Promise<Record<string, string> | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.access_token) return null
  return {
    Authorization: `Bearer ${session.access_token}`,
    apikey: ANON_KEY,
  }
}

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
    const headers = await authHeaders()
    if (!headers) return null
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
    const headers = await authHeaders()
    if (!headers) return []
    const res = await fetch(`${EDGE_FUNCTION_URL}?action=quotes&q=${symbols.join(',')}`, {
      headers,
    })
    if (!res.ok) return []
    const data = await res.json()
    return (Array.isArray(data) ? data : []) as QuoteResult[]
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
    const headers = await authHeaders()
    if (!headers) return []
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

export interface PriceOnDate {
  symbol: string
  /** Actual trading day used (nearest ≤ requested date). */
  date: string // 'YYYY-MM-DD'
  close: number
  currency: string
}

/**
 * Fetch a single symbol's close price on a specific historical date.
 * Used by AddPositionDialog so users don't have to key in the buy price
 * manually — selecting the symbol and the buy date is enough.
 */
export async function getPriceOnDate(symbol: string, date: string): Promise<PriceOnDate | null> {
  try {
    const headers = await authHeaders()
    if (!headers) return null
    const res = await fetch(
      `${EDGE_FUNCTION_URL}?action=priceOnDate&symbol=${encodeURIComponent(symbol)}&date=${encodeURIComponent(date)}`,
      { headers }
    )
    if (!res.ok) return null
    const data = await res.json()
    if (typeof data?.close !== 'number') return null
    return data as PriceOnDate
  } catch {
    return null
  }
}

export async function searchSymbols(
  query: string
): Promise<Array<{ symbol: string; name: string; exchange: string; type: string }>> {
  try {
    const headers = await authHeaders()
    if (!headers) return []
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
