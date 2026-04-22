import { supabase } from '../supabase'
import type { Position } from '../../types'

/**
 * Fetch positions whose sale date falls in a given calendar year. The year is
 * mapped to the inclusive range [YYYY-01-01, YYYY-12-31] — using a range
 * filter instead of `extract(year from sold_at)` keeps the query index-
 * friendly and, more importantly, human-readable.
 *
 * Scope: realized history. Unlike the "current portfolio" fetchers in
 * `lib/api/positions.ts`, this one only returns sold positions, sorted newest
 * sale first (what tax-year screens want by default).
 */
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
