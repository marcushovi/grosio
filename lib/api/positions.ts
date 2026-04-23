import { supabase, getAuthUserId } from '@/lib/supabase'
import { isSold } from '@/types'
import type { Position, PositionCurrency } from '@/types'

// Open positions only — sold ones go through `getRealizedPositions` in tax.ts.
export async function fetchAllPositions(): Promise<Position[]> {
  const { data, error } = await supabase
    .from('positions')
    .select('*')
    .is('sold_at', null)
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as Position[]
}

export async function fetchPositionsByBroker(brokerId: string): Promise<Position[]> {
  const { data, error } = await supabase
    .from('positions')
    .select('*')
    .eq('broker_id', brokerId)
    .is('sold_at', null)
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as Position[]
}

export interface InsertPositionInput {
  broker_id: string
  symbol: string
  name: string
  shares: number
  buy_price: number
  currency: PositionCurrency
  buy_date: string
}

const ALLOWED_CURRENCIES = ['EUR', 'USD', 'CZK'] as const

export async function insertPosition(position: InsertPositionInput): Promise<void> {
  if (!ALLOWED_CURRENCIES.includes(position.currency)) {
    throw new Error(`Unsupported currency: ${position.currency}`)
  }
  const userId = await getAuthUserId()
  if (!userId) throw new Error('Not authenticated')
  const { error } = await supabase.from('positions').insert({ ...position, user_id: userId })
  if (error) throw new Error(error.message)
}

export async function deletePosition(id: string): Promise<void> {
  const userId = await getAuthUserId()
  if (!userId) throw new Error('Not authenticated')
  const { error } = await supabase.from('positions').delete().eq('id', id).eq('user_id', userId)
  if (error) throw new Error(error.message)
}

// Editable fields only. user_id, broker_id, created_at and sold_* are
// excluded — selling/unselling goes through dedicated functions.
export type UpdatePositionInput = Partial<{
  symbol: string
  name: string
  shares: number
  buy_price: number
  buy_date: string | null
  currency: PositionCurrency
}>

// Throws if already sold (sold rows are immutable). The `.is('sold_at', null)`
// on update is the race-safety guard.
export async function updatePosition(
  positionId: string,
  input: UpdatePositionInput
): Promise<void> {
  if (input.currency && !ALLOWED_CURRENCIES.includes(input.currency)) {
    throw new Error(`Unsupported currency: ${input.currency}`)
  }

  const { data: existing, error: fetchErr } = await supabase
    .from('positions')
    .select('*')
    .eq('id', positionId)
    .single()
  if (fetchErr) throw new Error(fetchErr.message)
  if (!existing) throw new Error('Position not found')
  if (isSold(existing as Position)) throw new Error('Cannot edit a sold position')

  const { error } = await supabase
    .from('positions')
    .update(input)
    .eq('id', positionId)
    .is('sold_at', null)
  if (error) throw new Error(error.message)
}

// Full sale only (sold_shares = shares). Date check is client-side for UX;
// DB constraint `positions_sold_after_buy` is the real guard.
export async function sellPosition(
  positionId: string,
  input: { soldDate: string; soldPrice: number }
): Promise<void> {
  if (input.soldPrice <= 0) throw new Error('Sold price must be positive')

  const { data: existing, error: fetchErr } = await supabase
    .from('positions')
    .select('*')
    .eq('id', positionId)
    .single()
  if (fetchErr) throw new Error(fetchErr.message)
  if (!existing) throw new Error('Position not found')
  const pos = existing as Position
  if (isSold(pos)) throw new Error('Position is already sold')
  if (pos.buy_date && input.soldDate < pos.buy_date) {
    throw new Error('Sold date cannot be before buy date')
  }

  const { error } = await supabase
    .from('positions')
    .update({
      sold_at: input.soldDate,
      sold_price: input.soldPrice,
      sold_shares: pos.shares,
    })
    .eq('id', positionId)
    .is('sold_at', null)
  if (error) throw new Error(error.message)
}

// Reopen a sold position by clearing the sale fields.
export async function unsellPosition(positionId: string): Promise<void> {
  const { data: existing, error: fetchErr } = await supabase
    .from('positions')
    .select('*')
    .eq('id', positionId)
    .single()
  if (fetchErr) throw new Error(fetchErr.message)
  if (!existing) throw new Error('Position not found')
  if (!isSold(existing as Position)) throw new Error('Position is not sold')

  const { error } = await supabase
    .from('positions')
    .update({ sold_at: null, sold_price: null, sold_shares: null })
    .eq('id', positionId)
  if (error) throw new Error(error.message)
}
