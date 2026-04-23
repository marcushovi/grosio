import '@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'

const YAHOO_SEARCH_COUNT = 8
const PRICE_WINDOW_BEFORE_DAYS = 7
const PRICE_WINDOW_AFTER_DAYS = 2
const SECONDS_PER_DAY = 86400

// Function-scoped client used only to verify incoming session tokens. Uses
// the publishable key secret so `auth.getClaims()` can validate ES256 JWTs
// against the project JWKS.
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

  // Deployed with --no-verify-jwt because the gateway verifier does not
  // handle this project's new JWT Signing Keys. Validate the bearer here.
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
      const yahooUrl = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=${YAHOO_SEARCH_COUNT}&newsCount=0`
      const res = await fetch(yahooUrl, { headers: { 'User-Agent': UA } })
      const data = await res.json()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rawQuotes = (data?.quotes ?? []) as any[]
      const allowed = ['EQUITY', 'ETF']
      const quotes = rawQuotes
        .filter(q => allowed.includes(q.quoteType))
        .map(q => ({
          symbol: q.symbol ?? '',
          name: q.shortname ?? q.longname ?? q.symbol ?? '',
          exchange: q.exchange ?? '',
          type: q.quoteType ?? '',
        }))
      return json({ quotes })
    }

    if (action === 'priceOnDate' && symbol && date) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return json({ error: 'date (YYYY-MM-DD) required' }, 400)
      }
      try {
        const target = new Date(`${date}T00:00:00Z`).getTime()
        if (Number.isNaN(target)) return json({ error: 'invalid date' }, 400)

        // ±7-day window so weekends/holidays around the target are covered.
        const period1 = Math.floor((target - PRICE_WINDOW_BEFORE_DAYS * SECONDS_PER_DAY * 1000) / 1000)
        const period2 = Math.floor((target + PRICE_WINDOW_AFTER_DAYS * SECONDS_PER_DAY * 1000) / 1000)
        const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&period1=${period1}&period2=${period2}`
        const res = await fetch(yahooUrl, { headers: { 'User-Agent': UA } })
        if (!res.ok) throw new Error(`yahoo ${res.status}`)
        const data = await res.json()
        const result = data?.chart?.result?.[0]
        if (!result) throw new Error('no result')

        const timestamps: number[] = result.timestamp ?? []
        const closes: (number | null)[] = result.indicators?.quote?.[0]?.close ?? []
        const currency = result.meta?.currency ?? 'USD'

        // Prefer the trading day ≤ target. Falls back to the earliest
        // available close if target is before the first data point.
        const targetSec = Math.floor(target / 1000) + SECONDS_PER_DAY
        let bestClose: number | null = null
        let bestTs: number | null = null
        for (let i = 0; i < timestamps.length; i++) {
          const c = closes[i]
          if (c == null) continue
          if (timestamps[i] > targetSec) continue
          if (bestTs === null || timestamps[i] > bestTs) {
            bestTs = timestamps[i]
            bestClose = c
          }
        }
        if (bestClose === null) {
          for (let i = 0; i < timestamps.length; i++) {
            const c = closes[i]
            if (c != null) {
              bestTs = timestamps[i]
              bestClose = c
              break
            }
          }
        }

        if (bestClose === null || bestTs === null) {
          return json({ error: 'No price data for that date' }, 404)
        }

        return json({
          symbol,
          date: new Date(bestTs * 1000).toISOString().split('T')[0],
          close: bestClose,
          currency,
        })
      } catch (err) {
        console.error(`[priceOnDate] failed for ${symbol} ${date}:`, err)
        return json({ error: 'Price fetch failed' }, 500)
      }
    }

    if (action === 'quotes' && Array.isArray(symbols)) {
      if (symbols.length === 0) return json({ error: 'symbols required' }, 400)

      // Raw chart endpoint is cookie-free and proven reliable in this runtime.
      // yahoo-finance2's quoteCombine fails inside Deno's npm-compat layer.
      const results = await Promise.all(
        symbols.map(async sym => {
          try {
            const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=1d`
            const res = await fetch(yahooUrl, { headers: { 'User-Agent': UA } })
            if (!res.ok) return null
            const data = await res.json()
            const meta = data?.chart?.result?.[0]?.meta
            if (!meta) return null

            const prevClose =
              meta.chartPreviousClose ?? meta.previousClose ?? meta.regularMarketPrice ?? 0
            const price = meta.regularMarketPrice ?? 0

            return {
              symbol: sym,
              price,
              currency: meta.currency ?? 'USD',
              change: price - prevClose,
              changePercent: prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0,
              name: meta.shortName ?? meta.longName ?? sym,
            }
          } catch (err) {
            console.error(`[quotes] failed for ${sym}:`, err)
            return null
          }
        })
      )

      return json(results.filter(Boolean))
    }

    return json({ error: 'Invalid action. Use action=search|quotes|priceOnDate' }, 400)
  } catch (error) {
    return json({ error: String(error) }, 500)
  }
})
