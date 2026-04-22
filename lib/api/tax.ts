import { supabase } from '@/lib/supabase'
import type { Position } from '@/types'

// Realized history. Range filter on sold_at instead of `extract(year ...)`
// stays index-friendly. Sorted newest sale first.
export async function getRealizedPositions(year: number): Promise<Position[]> {
  const start = `${year}-01-01`
  const end = `${year}-12-31`
  const { data, error } = await supabase
    .from('positions')
    .select('*')
    .gte('sold_at', start)
    .lte('sold_at', end)
    .order('sold_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as Position[]
}
