import { QueryClient } from '@tanstack/react-query'

// 15 min staleTime matches the Yahoo Finance refresh window. gcTime keeps
// data warm for an hour after the last observer unmounts.
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
