import { useQuery } from '@tanstack/react-query'
import { useBrokers } from './useBrokers'
import { useSettings } from '../lib/settingsContext'
import { queryKeys } from '../lib/queryKeys'
import { fetchAllPositions } from '../lib/api/positions'
import { fetchPrices } from '../lib/api/prices'
import { getExchangeRates } from '../lib/api/currency'
import { computeTaxStatus, type TaxSummary } from '../lib/tax'

/**
 * Fetch positions + rates + live prices and fold them into a tax summary for
 * the current user's domicile + display currency. Shared by the tax screen
 * (full breakdown) and the dashboard (two-card brief overview) — extracting
 * keeps the queryFn and cache key in one place.
 */
export function useTaxSummary() {
  const { domicile, currency: displayCurrency } = useSettings()
  const { brokers } = useBrokers()

  return useQuery<TaxSummary, Error>({
    queryKey: queryKeys.tax.data(domicile, displayCurrency),
    queryFn: async () => {
      const [positions, rates] = await Promise.all([fetchAllPositions(), getExchangeRates()])
      const symbols = [...new Set(positions.map(p => p.symbol))]
      const priceMap = await fetchPrices(symbols)
      return computeTaxStatus(positions, brokers, domicile, displayCurrency, rates, priceMap)
    },
    enabled: brokers.length > 0,
    staleTime: 1000 * 60 * 15,
  })
}
