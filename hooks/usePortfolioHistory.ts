import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { getHistory } from '../lib/yahooFinance'
import { getExchangeRates, toEur, convertToDisplay } from '../lib/currency'
import { useSettings } from '../lib/settingsContext'
import type { Position } from '../types'

export interface PortfolioDataPoint {
  date: string // 'YYYY-MM-DD'
  value: number
}

const HISTORY_CACHE_TTL = 60 * 60 * 1000 // 1 hour

export function usePortfolioHistory() {
  const { currency: displayCurrency } = useSettings()

  const {
    data: fetchedData,
    isPending: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['portfolioHistoryEur'],
    staleTime: HISTORY_CACHE_TTL,
    queryFn: async () => {
      const exchangeRates = await getExchangeRates()

      const { data: positions, error: posErr } = await supabase.from('positions').select('*')
      if (posErr) throw posErr
      if (!positions || positions.length === 0) {
        return { dataEur: [], rates: exchangeRates }
      }

      const symbols = [...new Set((positions as Position[]).map(p => p.symbol))]

      const histories = await getHistory(symbols, '1wk', '1y')

      // Build map: symbol -> { date -> close price }
      const priceBySymbolDate = new Map<string, Map<string, number>>()
      const currencyBySymbol = new Map<string, string>()
      for (const hist of histories) {
        const dateMap = new Map<string, number>()
        for (const q of hist.quotes) {
          dateMap.set(q.date, q.close)
        }
        priceBySymbolDate.set(hist.symbol, dateMap)
        currencyBySymbol.set(hist.symbol, hist.currency)
      }

      // Collect all unique dates (sorted)
      const allDates = new Set<string>()
      for (const hist of histories) {
        for (const q of hist.quotes) {
          allDates.add(q.date)
        }
      }
      const sortedDates = Array.from(allDates).sort()

      // For each date, compute total portfolio value in EUR
      const points: PortfolioDataPoint[] = []
      for (const date of sortedDates) {
        let totalValueEur = 0

        for (const pos of positions as Position[]) {
          const dateMap = priceBySymbolDate.get(pos.symbol)
          if (!dateMap) continue

          let price: number | undefined = dateMap.get(date)
          if (price === undefined) {
            // Find nearest previous date with data
            const available = Array.from(dateMap.keys())
              .filter(d => d <= date)
              .sort()
            if (available.length > 0) {
              price = dateMap.get(available[available.length - 1])
            }
          }
          if (price === undefined) continue

          const posCurrency = currencyBySymbol.get(pos.symbol) ?? pos.currency
          totalValueEur += toEur(pos.shares * price, posCurrency, exchangeRates)
        }

        if (totalValueEur > 0) {
          points.push({ date, value: totalValueEur })
        }
      }

      return { dataEur: points, rates: exchangeRates }
    },
  })

  // Convert EUR base values to display currency — instant on currency switch
  const data = useMemo(() => {
    const dataEur = fetchedData?.dataEur ?? []
    const rates = fetchedData?.rates ?? null

    if (!rates || dataEur.length === 0) return []
    return dataEur.map(p => ({
      date: p.date,
      value: convertToDisplay(p.value, displayCurrency, rates),
    }))
  }, [fetchedData, displayCurrency])

  return { data, loading, error: error?.message ?? null, refetch: () => refetch() }
}
