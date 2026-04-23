import { FunctionsHttpError, FunctionsRelayError, FunctionsFetchError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { PositionCurrency } from '@/types'

// `functions.invoke` auto-attaches the user session JWT + project apikey.
// The Edge Function validates the token on every call.

async function logInvokeError(context: string, error: unknown): Promise<void> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json()
      console.warn(`[yahoo:${context}] HTTP error:`, body)
    } catch {
      console.warn(`[yahoo:${context}] HTTP error (unreadable body)`)
    }
  } else if (error instanceof FunctionsRelayError) {
    console.warn(`[yahoo:${context}] relay error:`, error.message)
  } else if (error instanceof FunctionsFetchError) {
    console.warn(`[yahoo:${context}] fetch error:`, error.message)
  } else {
    console.warn(`[yahoo:${context}]`, error instanceof Error ? error.message : String(error))
  }
}

// Collapse anything outside EUR/USD/CZK to USD so FX math stays exhaustive.
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

export type PriceMap = Record<string, QuoteResult>

export interface PriceOnDate {
  symbol: string
  date: string
  close: number
  currency: PositionCurrency
}

interface SearchResult {
  symbol: string
  name: string
  exchange: string
  type: string
}

export async function fetchPrices(symbols: string[]): Promise<PriceMap> {
  if (symbols.length === 0) return {}
  const { data, error } = await supabase.functions.invoke<QuoteResult[]>('yahoo-finance', {
    body: { action: 'quotes', symbols },
  })
  if (error) {
    await logInvokeError('fetchPrices', error)
    return {}
  }
  const raw = Array.isArray(data) ? data : []
  const map: PriceMap = {}
  for (const q of raw) {
    map[q.symbol] = { ...q, currency: narrowCurrency(q?.currency) }
  }
  return map
}

// Historical close on a specific day. Auto-fills buy_price in AddPositionDialog.
export async function getPriceOnDate(symbol: string, date: string): Promise<PriceOnDate | null> {
  const { data, error } = await supabase.functions.invoke<PriceOnDate>('yahoo-finance', {
    body: { action: 'priceOnDate', symbol, date },
  })
  if (error) {
    await logInvokeError('getPriceOnDate', error)
    return null
  }
  if (typeof data?.close !== 'number') return null
  return { ...data, currency: narrowCurrency(data.currency) }
}

export async function searchSymbols(query: string): Promise<SearchResult[]> {
  const { data, error } = await supabase.functions.invoke<{ quotes: SearchResult[] }>(
    'yahoo-finance',
    {
      body: { action: 'search', query },
    }
  )
  if (error) {
    await logInvokeError('searchSymbols', error)
    return []
  }
  return data?.quotes ?? []
}
