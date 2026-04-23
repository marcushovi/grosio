import { supabase } from '@/lib/supabase'
import type { Position } from '@/types'

// Realized history for a year. Range filter stays index-friendly. Newest first.
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
