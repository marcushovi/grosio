// Query key factory. Hierarchical so `invalidateQueries({ queryKey: X.all })`
// wipes every nested entry in one call.
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
  realized: {
    all: ['realized'] as const,
    byYear: (year: number) => [...queryKeys.realized.all, year] as const,
  },
} as const
