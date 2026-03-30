// Yahoo Finance cez Supabase Edge Function (pridáme neskôr)
// Alpaca priamy REST ako fallback
const ALPACA_BASE = 'https://data.alpaca.markets/v2'
const ALPACA_HEADERS = {
  'APCA-API-KEY-ID': process.env.EXPO_PUBLIC_ALPACA_KEY!,
  'APCA-API-SECRET-KEY': process.env.EXPO_PUBLIC_ALPACA_SECRET!,
}

export async function getLatestQuotes(symbols: string[]): Promise<Record<string, number>> {
  try {
    const res = await fetch(
      `${ALPACA_BASE}/stocks/quotes/latest?symbols=${symbols.join(',')}&feed=iex`,
      { headers: ALPACA_HEADERS }
    )
    const data = await res.json()
    const prices: Record<string, number> = {}
    for (const [symbol, quote] of Object.entries(data.quotes || {})) {
      prices[symbol] = (quote as any).ap || (quote as any).bp || 0
    }
    return prices
  } catch {
    return {}
  }
}
