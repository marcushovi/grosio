import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../lib/queryKeys'
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

/**
 * Mark a position as fully sold. The mutation invalidates every query that
 * looks at "current portfolio" (the position disappears from all open lists)
 * AND the realized history (the row appears there for the sale year).
 *
 * `realized.all` is invalidated rather than the specific year so that — even
 * if the user has multiple year-tabs cached — every realized view refetches.
 */
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

/** Reopen a sold position (clears the three sale fields). Same invalidations
 *  as `useSellPosition` — the row reappears in open views and disappears from
 *  realized history. */
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

/**
 * Edit an open position. Realized history is NOT invalidated — `updatePosition`
 * is rejected at the API layer for sold positions, so realized rows can never
 * change here. Tax summary IS invalidated because shares / buy_price /
 * buy_date all feed the tax-bucketing math.
 */
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
