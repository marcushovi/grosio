import { QueryClient } from '@tanstack/react-query'

/**
 * Shared TanStack Query client.
 *
 * staleTime of 15 minutes matches the Yahoo Finance quote refresh window —
 * we don't want to hammer the Edge Function every time a screen re-mounts.
 * gcTime keeps the cached data around for an hour after the last observer
 * unmounts, so navigating back to a screen shows instant data before any
 * refetch kicks in.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 15,
      gcTime: 1000 * 60 * 60,
      retry: 2,
      refetchOnWindowFocus: false,
      refetchOnMount: true,
    },
    mutations: {
      retry: 0,
    },
  },
})
