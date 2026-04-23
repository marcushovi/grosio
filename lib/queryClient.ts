import { QueryClient } from '@tanstack/react-query'

const MINUTE = 1000 * 60

// Cache windows. App-default matches Yahoo refresh cadence; rates are stable
// enough for an hour; gc keeps data warm after the last observer unmounts.
export const STALE_TIME = {
  DEFAULT: 15 * MINUTE,
  RATES: 60 * MINUTE,
} as const

export const GC_TIME = 60 * MINUTE

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: STALE_TIME.DEFAULT,
      gcTime: GC_TIME,
      retry: 2,
      refetchOnWindowFocus: false,
      refetchOnMount: true,
    },
    mutations: {
      retry: 0,
    },
  },
})
