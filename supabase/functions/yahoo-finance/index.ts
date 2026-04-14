import '@supabase/functions-js/edge-runtime.d.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'

Deno.serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const action = url.searchParams.get('action')
    const query = url.searchParams.get('q')
    const symbol = url.searchParams.get('symbol')

    if (action === 'search' && query) {
      const yahooUrl = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=8&newsCount=0`
      const res = await fetch(yahooUrl, { headers: { 'User-Agent': UA } })
      const data = await res.json()
      const rawQuotes = (data?.quotes ?? []) as any[]
      const allowed = ['EQUITY', 'ETF', 'MUTUALFUND', 'CRYPTOCURRENCY', 'INDEX']
      const quotes = rawQuotes
        .filter(q => allowed.includes(q.quoteType))
        .map(q => ({
          symbol: q.symbol ?? '',
          name: q.shortname ?? q.longname ?? q.symbol ?? '',
          exchange: q.exchange ?? '',
          type: q.quoteType ?? '',
        }))
      const body: { quotes: typeof quotes; hint?: string } = { quotes }
      if (quotes.length === 0 && rawQuotes.length > 0) {
        body.hint = 'Found results but none match equity/ETF/mutualfund/crypto/index types'
      }
      return new Response(JSON.stringify(body), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'quote' && symbol) {
      const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`
      const res = await fetch(yahooUrl, { headers: { 'User-Agent': UA } })
      const data = await res.json()
      const meta = data?.chart?.result?.[0]?.meta
      if (!meta) {
        return new Response(JSON.stringify({ error: 'Symbol not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const prevClose =
        meta.chartPreviousClose ?? meta.previousClose ?? meta.regularMarketPrice ?? 0
      const price = meta.regularMarketPrice ?? 0
      return new Response(
        JSON.stringify({
          quote: {
            symbol,
            price,
            currency: meta.currency ?? 'USD',
            change: price - prevClose,
            changePercent: prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0,
            name: meta.shortName ?? symbol,
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'priceOnDate' && symbol) {
      const date = url.searchParams.get('date')
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return new Response(JSON.stringify({ error: 'date (YYYY-MM-DD) required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      try {
        const target = new Date(`${date}T00:00:00Z`).getTime()
        if (Number.isNaN(target)) {
          return new Response(JSON.stringify({ error: 'invalid date' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        // Fetch a ±7-day daily window so weekends/holidays and the target day
        // itself are covered. Yahoo returns a 1d series of timestamp+close.
        const period1 = Math.floor((target - 7 * 86400 * 1000) / 1000)
        const period2 = Math.floor((target + 2 * 86400 * 1000) / 1000)
        const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&period1=${period1}&period2=${period2}`
        const res = await fetch(yahooUrl, { headers: { 'User-Agent': UA } })
        if (!res.ok) throw new Error(`yahoo ${res.status}`)
        const data = await res.json()
        const result = data?.chart?.result?.[0]
        if (!result) throw new Error('no result')

        const timestamps: number[] = result.timestamp ?? []
        const closes: (number | null)[] = result.indicators?.quote?.[0]?.close ?? []
        const currency = result.meta?.currency ?? 'USD'

        // Prefer the trading day ≤ target (end of that day in UTC). Falls back
        // to the earliest available close if target is before the first data point.
        const targetSec = Math.floor(target / 1000) + 86400
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
          return new Response(JSON.stringify({ error: 'No price data for that date' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        return new Response(
          JSON.stringify({
            symbol,
            date: new Date(bestTs * 1000).toISOString().split('T')[0],
            close: bestClose,
            currency,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } catch (err) {
        console.error(`[priceOnDate] failed for ${symbol} ${date}:`, err)
        return new Response(JSON.stringify({ error: 'Price fetch failed' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    if (action === 'quotes' && query) {
      const symbols = query.split(',').filter(Boolean)
      if (symbols.length === 0) {
        return new Response(JSON.stringify({ error: 'symbols required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Raw fetch against Yahoo's chart endpoint for each symbol in parallel.
      // yahoo-finance2's quoteCombine was tried here previously but silently
      // fails inside Deno's npm-compat layer (crumb/cookie handling issues).
      // Chart endpoint is cookie-free and identical to what the 'quote' action
      // already uses — proven reliable in this runtime.
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
            // Log so failures surface in Supabase Function logs instead of being
            // swallowed as "no data" on the client.
            console.error(`[quotes] failed for ${sym}:`, err)
            return null
          }
        })
      )

      return new Response(JSON.stringify(results.filter(Boolean)), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(
      JSON.stringify({
        error: 'Invalid action. Use action=search|quote|quotes|priceOnDate',
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
