import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useBrokers } from '@/hooks/useBrokers'
import { useSettings } from '@/lib/settingsContext'
import { queryKeys } from '@/lib/queryKeys'
import { fetchAllPositions } from '@/lib/api/positions'
import { fetchPrices } from '@/lib/api/yahoo'
import { getExchangeRates } from '@/lib/currency'
import { STALE_TIME } from '@/lib/queryClient'
import { computeTaxStatusBase, type TaxSummaryBase } from '@/lib/tax'
import type { ExchangeRates } from '@/lib/currency'

// Tax summary for the current domicile in EUR base. Caller projects via
// `projectTaxSummaryToDisplay` so changing display currency doesn't refetch.
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
          staleTime: STALE_TIME.RATES,
        }),
      ])
      const symbols = [...new Set(positions.map(p => p.symbol))]
      const priceMap = await fetchPrices(symbols)
      return computeTaxStatusBase(positions, brokers, domicile, rates, priceMap)
    },
    enabled: brokers.length > 0,
    staleTime: STALE_TIME.DEFAULT,
  })
}
