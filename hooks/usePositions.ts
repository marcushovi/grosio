import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../lib/queryKeys'
import {
  fetchAllPositions,
  fetchPositionsByBroker,
  insertPosition,
  deletePosition as deletePositionApi,
  type InsertPositionInput,
} from '../lib/api/positions'
import type { Position, MutationResult } from '../types'

/**
 * Positions query + add/delete mutations, scoped to a single broker.
 *
 * When `brokerId` is undefined, the hook stays disabled — the caller hasn't
 * resolved the URL param yet, and we don't want to fetch "all positions"
 * through this hook (dashboard + history use `fetchAllPositions` inline).
 */
export function usePositions(brokerId?: string) {
  const queryClient = useQueryClient()

  const { data, isPending, error, refetch } = useQuery<Position[], Error>({
    queryKey: brokerId ? queryKeys.positions.byBroker(brokerId) : queryKeys.positions.list(),
    queryFn: () => (brokerId ? fetchPositionsByBroker(brokerId) : fetchAllPositions()),
    enabled: brokerId !== undefined,
  })

  const addPositionMutation = useMutation({
    mutationFn: (position: InsertPositionInput) => insertPosition(position),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.positions.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all }),
      ])
    },
  })

  const deletePositionMutation = useMutation({
    mutationFn: (id: string) => deletePositionApi(id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.positions.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all }),
      ])
    },
  })

  return {
    positions: data ?? [],
    loading: isPending,
    error: error?.message ?? null,
    addPosition: async (position: InsertPositionInput): Promise<MutationResult> => {
      try {
        await addPositionMutation.mutateAsync(position)
        return { error: null }
      } catch (e) {
        return { error: { message: e instanceof Error ? e.message : String(e) } }
      }
    },
    deletePosition: async (id: string): Promise<MutationResult> => {
      try {
        await deletePositionMutation.mutateAsync(id)
        return { error: null }
      } catch (e) {
        return { error: { message: e instanceof Error ? e.message : String(e) } }
      }
    },
    refetch,
  }
}
