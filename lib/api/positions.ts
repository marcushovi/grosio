import { supabase, getAuthUserId } from '../supabase'
import type { Position } from '../../types'

/** Fetch every position the user owns, oldest first. */
export async function fetchAllPositions(): Promise<Position[]> {
  const { data, error } = await supabase
    .from('positions')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as Position[]
}

/** Fetch positions for a single broker, oldest first. */
export async function fetchPositionsByBroker(brokerId: string): Promise<Position[]> {
  const { data, error } = await supabase
    .from('positions')
    .select('*')
    .eq('broker_id', brokerId)
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as Position[]
}

export interface InsertPositionInput {
  broker_id: string
  symbol: string
  name: string
  shares: number
  avg_buy_price: number
  currency: string
  buy_date: string // 'YYYY-MM-DD'
}

/** Insert a new position owned by the current user. */
export async function insertPosition(position: InsertPositionInput): Promise<void> {
  const userId = await getAuthUserId()
  if (!userId) throw new Error('Not authenticated')
  const { error } = await supabase.from('positions').insert({ ...position, user_id: userId })
  if (error) throw new Error(error.message)
}

/** Delete a position by id. RLS enforces ownership. */
export async function deletePosition(id: string): Promise<void> {
  const userId = await getAuthUserId()
  if (!userId) throw new Error('Not authenticated')
  const { error } = await supabase.from('positions').delete().eq('id', id).eq('user_id', userId)
  if (error) throw new Error(error.message)
}
