/**
 * Centralised query key factory.
 *
 * All `useQuery` / `invalidateQueries` calls must source their keys from
 * here — typos in inline key arrays silently break invalidation, and
 * hierarchical keys let us invalidate a whole family in one call
 * (e.g. `invalidateQueries({ queryKey: queryKeys.positions.all })`
 * wipes every positions-by-broker entry too).
 */
export const queryKeys = {
  session: {
    all: ['session'] as const,
    current: () => [...queryKeys.session.all, 'current'] as const,
  },
  brokers: {
    all: ['brokers'] as const,
    list: () => [...queryKeys.brokers.all, 'list'] as const,
    byId: (id: string) => [...queryKeys.brokers.all, 'detail', id] as const,
  },
  positions: {
    all: ['positions'] as const,
    list: () => [...queryKeys.positions.all, 'list'] as const,
    byBroker: (brokerId: string) => [...queryKeys.positions.all, 'broker', brokerId] as const,
  },
  prices: {
    all: ['prices'] as const,
    quotes: (symbols: readonly string[]) =>
      [...queryKeys.prices.all, 'quotes', [...symbols].sort().join(',')] as const,
  },
  dashboard: {
    all: ['dashboard'] as const,
    data: () => [...queryKeys.dashboard.all, 'data'] as const,
  },
  exchangeRates: {
    all: ['exchangeRates'] as const,
    latest: () => [...queryKeys.exchangeRates.all, 'latest'] as const,
  },
  tax: {
    all: ['tax'] as const,
    data: (domicile: string) => [...queryKeys.tax.all, domicile] as const,
  },
} as const
