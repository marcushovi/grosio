import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '../lib/queryKeys'
import { getRealizedPositions } from '../lib/api/tax'
import type { Position } from '../types'

/**
 * Realized (sold) positions for a given calendar year. Backs the realized-tax
 * history view. Inherits the global 15-min staleTime from `queryClient`.
 */
export function useRealizedPositions(year: number) {
  return useQuery<Position[], Error>({
    queryKey: queryKeys.realized.byYear(year),
    queryFn: () => getRealizedPositions(year),
  })
}
