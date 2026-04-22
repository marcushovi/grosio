import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useBrokers } from '@/hooks/useBrokers'
import { useSettings } from '@/lib/settingsContext'
import { queryKeys } from '@/lib/queryKeys'
import { fetchAllPositions } from '@/lib/api/positions'
import { fetchPrices } from '@/lib/api/prices'
import { getExchangeRates } from '@/lib/api/currency'
import { computeTaxStatusBase, type TaxSummaryBase } from '@/lib/tax'
import type { ExchangeRates } from '@/lib/currency'

/**
 * Fetch positions + rates + live prices and fold them into a tax summary for
 * the current user's domicile. Returns the EUR-base computation — the caller
 * projects to display currency via `projectTaxSummaryToDisplay` in a memo, so
 * switching EUR/USD/CZK never refetches.
 */
export function useTaxSummary() {
  const { domicile } = useSettings()
  const { brokers } = useBrokers()
  const queryClient = useQueryClient()

  return useQuery<TaxSummaryBase, Error>({
    queryKey: queryKeys.tax.data(domicile),
    queryFn: async () => {
      const [positions, rates] = await Promise.all([
        fetchAllPositions(),
        queryClient.fetchQuery<ExchangeRates>({
          queryKey: queryKeys.exchangeRates.latest(),
          queryFn: getExchangeRates,
          staleTime: 1000 * 60 * 60,
        }),
      ])
      const symbols = [...new Set(positions.map(p => p.symbol))]
      const priceMap = await fetchPrices(symbols)
      return computeTaxStatusBase(positions, brokers, domicile, rates, priceMap)
    },
    enabled: brokers.length > 0,
    staleTime: 1000 * 60 * 15,
  })
}
