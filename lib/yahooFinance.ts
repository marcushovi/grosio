import { supabase } from '@/lib/supabase'
import type { PositionCurrency } from '@/types'

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

function logError(context: string, error: unknown): void {
  console.warn(`[yahooFinance:${context}]`, error instanceof Error ? error.message : String(error))
}

/** Log a non-2xx response from the Edge Function with the body so 401/500
 *  failures don't silently collapse into empty result arrays. Attempts to
 *  parse the body as JSON (the edge function responds with `{ error }`);
 *  falls back to the raw text otherwise. */
async function logHttpFailure(context: string, res: Response): Promise<void> {
  let body: string
  try {
    body = await res.clone().text()
  } catch {
    body = '<unreadable>'
  }
  console.warn(`[yahooFinance:${context}] HTTP ${res.status} ${res.statusText}: ${body}`)
}

/** Narrow whatever currency string Yahoo returned to the app's supported set.
 *  EUR / USD / CZK pass through; everything else (GBP, JPY, CHF, ...) collapses
 *  to USD so downstream FX math stays exhaustive. A misclassified GBP position
 *  lands in a currency we can convert, not get quietly mis-valued. */
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
    const res = await fetch(`${EDGE_FUNCTION_URL}?action=quotes&q=${q}`, {
      headers,
    })
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
  /** Actual trading day used (nearest ≤ requested date). */
  date: string // 'YYYY-MM-DD'
  close: number
  currency: PositionCurrency
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
