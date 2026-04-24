import '@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import YahooFinance from 'yahoo-finance2'

const yahooFinance = new YahooFinance()
const QUOTE_FIELDS = [
  'symbol',
  'regularMarketPrice',
  'regularMarketChange',
  'regularMarketChangePercent',
  'currency',
  'shortName',
  'longName',
] as const

const YAHOO_SEARCH_COUNT = 8
const PRICE_WINDOW_BEFORE_DAYS = 7
const PRICE_WINDOW_AFTER_DAYS = 2
const SECONDS_PER_DAY = 86400

// Client used only to verify incoming session tokens. Uses the publishable
// key so `auth.getClaims()` can validate ES256 JWTs against the project JWKS.
const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SB_PUBLISHABLE_KEY')!)

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

interface RequestBody {
  action?: 'search' | 'quotes' | 'priceOnDate'
  query?: string
  symbol?: string
  symbols?: string[]
  date?: string
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  // Manual JWT validation — gateway verifier does not yet handle this
  // project's JWT Signing Keys, so the function verifies the bearer itself.
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'Missing Authorization header' }, 401)
  const token = authHeader.replace(/^Bearer\s+/i, '')
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token)
  if (claimsError || !claimsData?.claims) return json({ error: 'Invalid JWT' }, 401)

  let body: RequestBody
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const { action, query, symbol, symbols, date } = body

  try {
    if (action === 'search' && query) {
      try {
        const data = await yahooFinance.search(query, {
          quotesCount: YAHOO_SEARCH_COUNT,
          newsCount: 0,
        })
        const allowed = ['EQUITY', 'ETF']
        const quotes = (data.quotes ?? [])
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .filter((q: any) => allowed.includes(q.quoteType))
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((q: any) => ({
            symbol: q.symbol ?? '',
            name: q.shortname ?? q.longname ?? q.symbol ?? '',
            exchange: q.exchange ?? '',
            type: q.quoteType ?? '',
          }))
        return json({ quotes })
      } catch (err) {
        console.error('[search] failed:', err)
        return json({ error: 'Search failed' }, 500)
      }
    }

    if (action === 'priceOnDate' && symbol && date) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return json({ error: 'date (YYYY-MM-DD) required' }, 400)
      }
      try {
        const targetMs = new Date(`${date}T00:00:00Z`).getTime()
        if (Number.isNaN(targetMs)) return json({ error: 'invalid date' }, 400)

        // ±7-day window so weekends/holidays around the target are covered.
        const period1 = new Date(targetMs - PRICE_WINDOW_BEFORE_DAYS * SECONDS_PER_DAY * 1000)
        const period2 = new Date(targetMs + PRICE_WINDOW_AFTER_DAYS * SECONDS_PER_DAY * 1000)

        const result = await yahooFinance.chart(symbol, {
          period1,
          period2,
          interval: '1d',
        })

        const quotes = result.quotes ?? []
        const currency = result.meta?.currency ?? 'USD'

        // Prefer the trading day ≤ target; fall back to earliest close if
        // target precedes the first data point.
        const cutoffMs = targetMs + SECONDS_PER_DAY * 1000
        let best: { close: number; date: Date } | null = null
        for (const q of quotes) {
          const close = q.close
          const ts = q.date instanceof Date ? q.date : new Date(q.date as unknown as string)
          if (close == null || Number.isNaN(ts.getTime())) continue
          if (ts.getTime() > cutoffMs) continue
          if (!best || ts.getTime() > best.date.getTime()) {
            best = { close, date: ts }
          }
        }
        if (!best) {
          for (const q of quotes) {
            const close = q.close
            const ts = q.date instanceof Date ? q.date : new Date(q.date as unknown as string)
            if (close != null && !Number.isNaN(ts.getTime())) {
              best = { close, date: ts }
              break
            }
          }
        }

        if (!best) return json({ error: 'No price data for that date' }, 404)

        return json({
          symbol,
          date: best.date.toISOString().split('T')[0],
          close: best.close,
          currency,
        })
      } catch (err) {
        console.error(`[priceOnDate] failed for ${symbol} ${date}:`, err)
        return json({ error: 'Price fetch failed' }, 500)
      }
    }

    if (action === 'quotes' && Array.isArray(symbols)) {
      if (symbols.length === 0) return json({ error: 'symbols required' }, 400)

      // Single Yahoo /v7/finance/quote call for all symbols (yahoo-finance2
      // handles crumb/cookie internally). `return: 'object'` for O(1) lookup.
      try {
        const quotes = await yahooFinance.quote(symbols, {
          return: 'object',
          fields: [...QUOTE_FIELDS],
        })
        const results = symbols
          .map(sym => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const q = (quotes as Record<string, any>)[sym]
            if (!q || typeof q.regularMarketPrice !== 'number') return null
            return {
              symbol: sym,
              price: q.regularMarketPrice,
              currency: q.currency ?? 'USD',
              change: q.regularMarketChange ?? 0,
              changePercent: q.regularMarketChangePercent ?? 0,
              name: q.shortName ?? q.longName ?? sym,
            }
          })
          .filter(Boolean)
        return json(results)
      } catch (err) {
        console.error('[quotes] failed:', err)
        return json({ error: 'Quote fetch failed' }, 500)
      }
    }

    return json({ error: 'Invalid action. Use action=search|quotes|priceOnDate' }, 400)
  } catch (error) {
    return json({ error: String(error) }, 500)
  }
})
