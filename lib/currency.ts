const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

interface CachedRate {
  rate: number
  timestamp: number
}

let memCache: CachedRate | null = null

export async function getEurUsdRate(): Promise<number> {
  const now = Date.now()

  if (memCache && now - memCache.timestamp < CACHE_TTL_MS) {
    return memCache.rate
  }

  try {
    const res = await fetch('https://api.frankfurter.app/latest?from=USD&to=EUR')
    if (!res.ok) throw new Error('Frankfurter fetch failed')
    const data = await res.json()
    const rate: number = data.rates?.EUR ?? 0.92
    memCache = { rate, timestamp: now }
    return rate
  } catch {
    return memCache?.rate ?? 0.92
  }
}

export function usdToEur(usdAmount: number, rate: number): number {
  return usdAmount * rate
}

export function toEur(amount: number, currency: string, eurUsdRate: number): number {
  if (currency === 'EUR') return amount
  if (currency === 'USD') return usdToEur(amount, eurUsdRate)
  return amount
}
