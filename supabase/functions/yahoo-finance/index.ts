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
      const quotes: Record<string, any> = {}
      await Promise.all(
        symbols.map(async sym => {
          const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${sym}?interval=1d&range=1d`
          const res = await fetch(yahooUrl, { headers: { 'User-Agent': UA } })
          const data = await res.json()
          const meta = data?.chart?.result?.[0]?.meta
          if (meta) {
            const prevClose =
              meta.chartPreviousClose ?? meta.previousClose ?? meta.regularMarketPrice ?? 0
            const price = meta.regularMarketPrice ?? 0
            quotes[sym] = {
              symbol: sym,
              price,
              currency: meta.currency ?? 'USD',
              change: price - prevClose,
              changePercent: prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0,
              name: meta.shortName ?? sym,
            }
          }
        })
      )
      return new Response(JSON.stringify({ quotes }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action. Use action=search|quote|quotes' }),
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
