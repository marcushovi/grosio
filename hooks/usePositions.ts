import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'
import {
  fetchAllPositions,
  fetchPositionsByBroker,
  insertPosition,
  deletePosition as deletePositionApi,
  sellPosition,
  unsellPosition,
  updatePosition,
  type InsertPositionInput,
  type UpdatePositionInput,
} from '@/lib/api/positions'
import type { Position, MutationResult } from '@/types'

// Positions scoped to a broker. Disabled while brokerId is undefined so the
// initial render doesn't accidentally fetch "all positions".
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
        queryClient.invalidateQueries({ queryKey: queryKeys.tax.all }),
      ])
    },
  })

  const deletePositionMutation = useMutation({
    mutationFn: (id: string) => deletePositionApi(id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.positions.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.tax.all }),
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

// Invalidates open lists + dashboard + tax + realized (the row now shows
// up in the realized view for the sale year).
export function useSellPosition() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      positionId,
      soldDate,
      soldPrice,
    }: {
      positionId: string
      soldDate: string
      soldPrice: number
    }) => sellPosition(positionId, { soldDate, soldPrice }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.positions.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.tax.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.realized.all }),
      ])
    },
  })
}

// Inverse of useSellPosition.
export function useUnsellPosition() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (positionId: string) => unsellPosition(positionId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.positions.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.tax.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.realized.all }),
      ])
    },
  })
}

// Realized history stays valid — the API rejects edits on sold positions.
export function useUpdatePosition() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ positionId, input }: { positionId: string; input: UpdatePositionInput }) =>
      updatePosition(positionId, input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.positions.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.tax.all }),
      ])
    },
  })
}
