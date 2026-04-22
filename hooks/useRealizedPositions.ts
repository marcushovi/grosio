import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'
import { getRealizedPositions } from '@/lib/api/tax'
import type { Position } from '@/types'

// Sold positions for a calendar year. Inherits the global 15-min staleTime.
export function useRealizedPositions(year: number) {
  return useQuery<Position[], Error>({
    queryKey: queryKeys.realized.byYear(year),
    queryFn: () => getRealizedPositions(year),
  })
}
