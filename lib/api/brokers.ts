import { supabase, getAuthUserId } from '@/lib/supabase'
import type { Broker } from '@/types'

/** Fetch all brokers for the current user, oldest first. */
export async function fetchBrokers(): Promise<Broker[]> {
  const { data, error } = await supabase
    .from('brokers')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as Broker[]
}

/** Fetch a single broker by id. Returns `null` when the row doesn't exist
 *  (RLS-filtered-out or deleted) — other errors still throw. */
export async function fetchBrokerById(id: string): Promise<Broker | null> {
  const { data, error } = await supabase.from('brokers').select('*').eq('id', id).single()
  if (error) {
    if (error.code === 'PGRST116') return null // no rows
    throw new Error(error.message)
  }
  return data as Broker
}

/** Insert a broker owned by the current user. */
export async function insertBroker(name: string, color: string): Promise<void> {
  const userId = await getAuthUserId()
  if (!userId) throw new Error('Not authenticated')
  const { error } = await supabase.from('brokers').insert({ name, color, user_id: userId })
  if (error) throw new Error(error.message)
}

/** Delete a broker by id. RLS enforces ownership; the user_id filter is
 *  a belt-and-braces check in case RLS is ever loosened. */
export async function deleteBroker(id: string): Promise<void> {
  const userId = await getAuthUserId()
  if (!userId) throw new Error('Not authenticated')
  const { error } = await supabase.from('brokers').delete().eq('id', id).eq('user_id', userId)
  if (error) throw new Error(error.message)
}

export type UpdateBrokerInput = Partial<{
  name: string
  color: string
}>

/** Edit a broker's mutable fields (name, color). RLS enforces ownership. */
export async function updateBroker(brokerId: string, input: UpdateBrokerInput): Promise<Broker> {
  const { data, error } = await supabase
    .from('brokers')
    .update(input)
    .eq('id', brokerId)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as Broker
}
