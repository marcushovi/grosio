import { useState, useEffect, useCallback } from 'react'
import { supabase, getAuthUserId } from '../lib/supabase'
import type { Broker } from '../types'

export function useBrokers() {
  const [brokers, setBrokers] = useState<Broker[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchBrokers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: fetchErr } = await supabase
        .from('brokers')
        .select('*')
        .order('created_at', { ascending: true })
      if (fetchErr) throw fetchErr
      setBrokers(data || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load brokers')
    } finally {
      setLoading(false)
    }
  }, [])

  const addBroker = useCallback(
    async (name: string, color: string) => {
      const userId = await getAuthUserId()
      if (!userId) return { error: { message: 'Not authenticated' } }
      const { error } = await supabase.from('brokers').insert({ name, color, user_id: userId })
      if (!error) await fetchBrokers()
      return { error }
    },
    [fetchBrokers]
  )

  const deleteBroker = useCallback(
    async (id: string) => {
      const userId = await getAuthUserId()
      if (!userId) return { error: { message: 'Not authenticated' } }
      const { error } = await supabase.from('brokers').delete().eq('id', id).eq('user_id', userId)
      if (!error) await fetchBrokers()
      return { error }
    },
    [fetchBrokers]
  )

  useEffect(() => {
    fetchBrokers()
  }, [fetchBrokers])

  return { brokers, loading, error, addBroker, deleteBroker, refetch: fetchBrokers }
}
