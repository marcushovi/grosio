import { supabase, getAuthUserId } from '@/lib/supabase'
import { isSold } from '@/types'
import type { Position, PositionCurrency } from '@/types'

/**
 * Fetch every OPEN position the user owns, oldest first.
 *
 * Scope: current portfolio. Sold positions are excluded at the query layer so
 * every downstream consumer (dashboard, brokers list, tax summary, broker
 * detail) sees only live holdings without having to filter themselves.
 * Realized history goes through `lib/api/tax.ts::getRealizedPositions`.
 */
export async function fetchAllPositions(): Promise<Position[]> {
  const { data, error } = await supabase
    .from('positions')
    .select('*')
    .is('sold_at', null)
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as Position[]
}

/**
 * Fetch OPEN positions for a single broker, oldest first.
 *
 * Same scope as `fetchAllPositions` — broker-detail is a "current portfolio"
 * surface, so closed positions are hidden here too.
 */
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
  buy_date: string // 'YYYY-MM-DD'
}

const ALLOWED_CURRENCIES = ['EUR', 'USD', 'CZK'] as const

/** Insert a new position owned by the current user. */
export async function insertPosition(position: InsertPositionInput): Promise<void> {
  if (!ALLOWED_CURRENCIES.includes(position.currency)) {
    throw new Error(`Unsupported currency: ${position.currency}`)
  }
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

/** Fields a user can edit on an open position. `user_id`, `broker_id`,
 *  `created_at` and the three `sold_*` fields are intentionally not editable
 *  through this path — selling/unselling goes through `sellPosition` /
 *  `unsellPosition`. */
export type UpdatePositionInput = Partial<{
  symbol: string
  name: string
  shares: number
  buy_price: number
  buy_date: string | null
  currency: PositionCurrency
}>

/**
 * Edit an open position. Throws if the position is already sold (sold
 * positions are immutable — realized P&L must not change after the fact).
 *
 * The `.is('sold_at', null)` on the update is a DB-level guard: if someone
 * marks the position as sold in parallel, the update matches zero rows and
 * we surface the same "already sold" error.
 */
export async function updatePosition(
  positionId: string,
  input: UpdatePositionInput
): Promise<Position> {
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

  const { data, error } = await supabase
    .from('positions')
    .update(input)
    .eq('id', positionId)
    .is('sold_at', null)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as Position
}

/**
 * Mark an open position as fully sold. Enforces `sold_shares = shares` (full
 * sale only — partial sales are not modelled). Validates `sold_date >=
 * buy_date` client-side for a clearer error message; the DB's
 * `positions_sold_after_buy` CHECK is the real guard.
 */
export async function sellPosition(
  positionId: string,
  input: { soldDate: string; soldPrice: number }
): Promise<Position> {
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

  const { data, error } = await supabase
    .from('positions')
    .update({
      sold_at: input.soldDate,
      sold_price: input.soldPrice,
      sold_shares: pos.shares,
    })
    .eq('id', positionId)
    .is('sold_at', null)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as Position
}

/** Revert a sold position back to open by clearing the three sale fields.
 *  Used for undo / correcting a mistakenly recorded sale. */
export async function unsellPosition(positionId: string): Promise<Position> {
  const { data: existing, error: fetchErr } = await supabase
    .from('positions')
    .select('*')
    .eq('id', positionId)
    .single()
  if (fetchErr) throw new Error(fetchErr.message)
  if (!existing) throw new Error('Position not found')
  if (!isSold(existing as Position)) throw new Error('Position is not sold')

  const { data, error } = await supabase
    .from('positions')
    .update({ sold_at: null, sold_price: null, sold_shares: null })
    .eq('id', positionId)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as Position
}
