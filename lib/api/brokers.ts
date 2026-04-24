import { supabase, getAuthUserId } from '@/lib/supabase'
import type { Broker } from '@/types'

export async function fetchBrokers(): Promise<Broker[]> {
  const { data, error } = await supabase
    .from('brokers')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as Broker[]
}

// Returns null when the row does not exist (RLS-filtered or deleted).
export async function fetchBrokerById(id: string): Promise<Broker | null> {
  const { data, error } = await supabase.from('brokers').select('*').eq('id', id).single()
  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(error.message)
  }
  return data as Broker
}

export async function insertBroker(name: string, color: string): Promise<void> {
  const trimmed = name.trim()
  if (!trimmed) throw new Error('Name is required')
  const userId = await getAuthUserId()
  if (!userId) throw new Error('Not authenticated')
  const { error } = await supabase.from('brokers').insert({ name: trimmed, color, user_id: userId })
  if (error) throw new Error(error.message)
}

// RLS enforces ownership; the user_id filter is belt-and-braces.
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

export async function updateBroker(brokerId: string, input: UpdateBrokerInput): Promise<void> {
  const patch: UpdateBrokerInput = { ...input }
  if (input.name !== undefined) {
    const name = input.name.trim()
    if (!name) throw new Error('Name is required')
    patch.name = name
  }
  const { error } = await supabase.from('brokers').update(patch).eq('id', brokerId)
  if (error) throw new Error(error.message)
}
