import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'
import {
  fetchBrokers,
  insertBroker,
  deleteBroker as deleteBrokerApi,
  updateBroker,
  type UpdateBrokerInput,
} from '@/lib/api/brokers'
import type { Broker, MutationResult } from '@/types'

// Brokers list + add/delete. Each mutation awaits invalidation so by the time
// mutateAsync resolves, the dashboard / positions caches have refreshed.
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

  // ON DELETE CASCADE on the DB removes the broker's positions server-side.
  const deleteBrokerMutation = useMutation({
    mutationFn: (id: string) => deleteBrokerApi(id),
    onSuccess: async () => {
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
    // Raw mutations for new call sites (preferred).
    addBrokerMutation,
    deleteBrokerMutation,
    // Legacy wrappers returning MutationResult.
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

// Edit name/color. Positions queries are not invalidated — position rows
// don't render broker fields directly, they come from the brokers query.
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
