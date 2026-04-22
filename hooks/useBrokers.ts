import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../lib/queryKeys'
import {
  fetchBrokers,
  insertBroker,
  deleteBroker as deleteBrokerApi,
  updateBroker,
  type UpdateBrokerInput,
} from '../lib/api/brokers'
import type { Broker, MutationResult } from '../types'

/**
 * Brokers query + add/delete mutations.
 *
 * Used by the dashboard, brokers list and broker-detail screens. Each
 * mutation awaits `invalidateQueries`, so by the time `mutateAsync` resolves
 * the dashboard / positions caches have been refreshed — the UI (e.g. a
 * closing dialog) sees the new state immediately.
 */
export function useBrokers() {
  const queryClient = useQueryClient()

  const { data, isPending, error, refetch } = useQuery<Broker[], Error>({
    queryKey: queryKeys.brokers.list(),
    queryFn: fetchBrokers,
  })

  const addBrokerMutation = useMutation({
    mutationFn: ({ name, color }: { name: string; color: string }) => insertBroker(name, color),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.brokers.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.tax.all }),
      ])
    },
  })

  const deleteBrokerMutation = useMutation({
    mutationFn: (id: string) => deleteBrokerApi(id),
    onSuccess: async () => {
      // ON DELETE CASCADE on positions.broker_id removes the broker's positions
      // server-side. Invalidate every query that reads positions or derived
      // portfolio data so they refetch against the new state.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.brokers.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.positions.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.tax.all }),
      ])
    },
  })

  return {
    brokers: data ?? [],
    loading: isPending,
    error: error?.message ?? null,
    /** Raw TanStack mutations — prefer these for new call sites so the
     *  caller controls error handling via `onSuccess`/`onError` callbacks. */
    addBrokerMutation,
    deleteBrokerMutation,
    /** Wrapper form kept for callers that still use the bespoke shape. */
    addBroker: async (name: string, color: string): Promise<MutationResult> => {
      try {
        await addBrokerMutation.mutateAsync({ name, color })
        return { error: null }
      } catch (e) {
        return { error: { message: e instanceof Error ? e.message : String(e) } }
      }
    },
    deleteBroker: async (id: string): Promise<MutationResult> => {
      try {
        await deleteBrokerMutation.mutateAsync(id)
        return { error: null }
      } catch (e) {
        return { error: { message: e instanceof Error ? e.message : String(e) } }
      }
    },
    refetch,
  }
}

/**
 * Edit a broker's name and/or color. Invalidates the broker list (the list
 * itself renders both fields), the dashboard (allocation legend shows broker
 * name + color swatch) and the tax summary (groups its rows by broker name
 * and color). Position lists don't render broker name/color directly, so
 * `positions.all` is intentionally NOT invalidated here.
 */
export function useUpdateBroker() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ brokerId, input }: { brokerId: string; input: UpdateBrokerInput }) =>
      updateBroker(brokerId, input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.brokers.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.tax.all }),
      ])
    },
  })
}
