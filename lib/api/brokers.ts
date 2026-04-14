import { supabase, getAuthUserId } from '../supabase'
import type { Broker } from '../../types'

/** Fetch all brokers for the current user, oldest first. */
export async function fetchBrokers(): Promise<Broker[]> {
  const { data, error } = await supabase
    .from('brokers')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as Broker[]
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
