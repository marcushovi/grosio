import { supabase } from '@/lib/supabase'
import type { PositionCurrency } from '@/types'

const EDGE_FUNCTION_URL = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/yahoo-finance`
const ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY ?? ''

// Bearer = user session JWT (identity), apikey = anon key (project routing).
// Returns null if not signed in — callers short-circuit.
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

function logError(context: string, error: unknown): void {
  console.warn(`[yahooFinance:${context}]`, error instanceof Error ? error.message : String(error))
}

async function logHttpFailure(context: string, res: Response): Promise<void> {
  let body: string
  try {
    body = await res.clone().text()
  } catch {
    body = '<unreadable>'
  }
  console.warn(`[yahooFinance:${context}] HTTP ${res.status} ${res.statusText}: ${body}`)
}

// Narrow Yahoo's currency string to the supported set. Anything outside
// EUR/USD/CZK collapses to USD so the FX math stays exhaustive.
function narrowCurrency(raw: string | null | undefined): PositionCurrency {
  if (raw === 'EUR' || raw === 'USD' || raw === 'CZK') return raw
  return 'USD'
}

export interface QuoteResult {
  symbol: string
  price: number
  currency: PositionCurrency
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
    if (!res.ok) {
      await logHttpFailure('getQuote', res)
      return null
    }
    const data = await res.json()
    const quote = data?.quote
    if (!quote) return null
    return { ...quote, currency: narrowCurrency(quote.currency) }
  } catch (error) {
    logError('getQuote', error)
    return null
  }
}

export async function getQuotes(symbols: string[]): Promise<QuoteResult[]> {
  if (symbols.length === 0) return []
  try {
    const headers = await authHeaders()
    if (!headers) return []
    const q = symbols.map(encodeURIComponent).join(',')
    const res = await fetch(`${EDGE_FUNCTION_URL}?action=quotes&q=${q}`, { headers })
    if (!res.ok) {
      await logHttpFailure('getQuotes', res)
      return []
    }
    const data = await res.json()
    const raw = Array.isArray(data) ? data : []
    return raw.map(q => ({ ...q, currency: narrowCurrency(q?.currency) })) as QuoteResult[]
  } catch (error) {
    logError('getQuotes', error)
    return []
  }
}

export interface PriceOnDate {
  symbol: string
  date: string
  close: number
  currency: PositionCurrency
}

// Historical close on a specific day. Used to auto-fill buy_price in the add
// position dialog.
export async function getPriceOnDate(symbol: string, date: string): Promise<PriceOnDate | null> {
  try {
    const headers = await authHeaders()
    if (!headers) return null
    const res = await fetch(
      `${EDGE_FUNCTION_URL}?action=priceOnDate&symbol=${encodeURIComponent(symbol)}&date=${encodeURIComponent(date)}`,
      { headers }
    )
    if (!res.ok) {
      await logHttpFailure('getPriceOnDate', res)
      return null
    }
    const data = await res.json()
    if (typeof data?.close !== 'number') return null
    return { ...data, currency: narrowCurrency(data.currency) } as PriceOnDate
  } catch (error) {
    logError('getPriceOnDate', error)
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
    if (!res.ok) {
      await logHttpFailure('searchSymbols', res)
      return []
    }
    const data = await res.json()
    return data?.quotes ?? []
  } catch (error) {
    logError('searchSymbols', error)
    return []
  }
}
