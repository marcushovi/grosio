import '@supabase/functions-js/edge-runtime.d.ts'
import yahooFinance from 'yahoo-finance2'

// Silence yahoo-finance2's marketing/survey notices in Edge Function logs.
yahooFinance.suppressNotices(['yahooSurvey', 'ripHistorical'])

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'

// Shape returned by yahooFinance.quoteCombine when we request the 6 fields below.
// Each field is optional because Yahoo may omit it for some symbol types.
interface QuoteFields {
  symbol?: string
  regularMarketPrice?: number
  currency?: string
  regularMarketChange?: number
  regularMarketChangePercent?: number
  shortName?: string
}

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
      const quotes = (data?.quotes ?? [])
        .filter((q: any) => q.quoteType === 'EQUITY' || q.quoteType === 'ETF')
        .map((q: any) => ({
          symbol: q.symbol ?? '',
          name: q.shortname ?? q.longname ?? q.symbol ?? '',
          exchange: q.exchange ?? '',
          type: q.quoteType ?? '',
        }))
      return new Response(JSON.stringify({ quotes }), {
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

    if (action === 'quotes' && query) {
      const symbols = query.split(',').filter(Boolean)
      if (symbols.length === 0) {
        return new Response(JSON.stringify({ error: 'symbols required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // quoteCombine debounces all calls within a 50ms window into a SINGLE
      // Yahoo quote() HTTP request. Wrapping N calls in Promise.all therefore
      // results in exactly one network round-trip regardless of symbol count.
      // Field filtering further trims the payload vs. a full quote response.
      // Unknown/delisted symbols resolve to undefined → .catch → null → filtered out.
      const results = (await Promise.all(
        symbols.map(sym =>
          yahooFinance
            .quoteCombine(sym, {
              fields: [
                'symbol',
                'regularMarketPrice',
                'currency',
                'regularMarketChange',
                'regularMarketChangePercent',
                'shortName',
              ],
            })
            .catch(() => null)
        )
      )) as (QuoteFields | null)[]

      const quotes = results
        .filter((q): q is QuoteFields => q != null && typeof q.symbol === 'string')
        .map(q => ({
          symbol: q.symbol!,
          price: q.regularMarketPrice ?? 0,
          currency: q.currency ?? 'USD',
          change: q.regularMarketChange ?? 0,
          changePercent: q.regularMarketChangePercent ?? 0,
          name: q.shortName ?? q.symbol!,
        }))

      return new Response(JSON.stringify(quotes), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'history' && query) {
      const symbols = query.split(',').filter(Boolean)
      const interval = url.searchParams.get('interval') || '1wk'
      const range = url.searchParams.get('range') || '1y'

      const history = await Promise.all(
        symbols.map(async (sym: string) => {
          try {
            const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${sym}?interval=${interval}&range=${range}`
            const res = await fetch(yahooUrl, { headers: { 'User-Agent': UA } })
            const data = await res.json()
            const result = data?.chart?.result?.[0]
            if (!result) return { symbol: sym, currency: 'USD', quotes: [] }

            const timestamps: number[] = result.timestamp ?? []
            const closes: (number | null)[] = result.indicators?.quote?.[0]?.close ?? []
            const currency = result.meta?.currency ?? 'USD'

            const quotes: Array<{ date: string; close: number }> = []
            for (let i = 0; i < timestamps.length; i++) {
              if (closes[i] != null) {
                quotes.push({
                  date: new Date(timestamps[i] * 1000).toISOString().split('T')[0],
                  close: closes[i]!,
                })
              }
            }

            return { symbol: sym, currency, quotes }
          } catch {
            return { symbol: sym, currency: 'USD', quotes: [] }
          }
        })
      )

      return new Response(JSON.stringify({ history }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action. Use action=search|quote|quotes|history' }),
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
