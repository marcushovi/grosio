import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { Broker } from '../types'

export function useBrokers() {
  const [brokers, setBrokers] = useState<Broker[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchBrokers = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('brokers')
      .select('*')
      .order('created_at', { ascending: true })
    if (error) setError(error.message)
    else setBrokers(data || [])
    setLoading(false)
  }, [])

  const addBroker = useCallback(
    async (name: string, color: string) => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) return { error: { message: 'Not authenticated' } }
      const { error } = await supabase.from('brokers').insert({ name, color, user_id: user.id })
      if (!error) await fetchBrokers()
      return { error }
    },
    [fetchBrokers]
  )

  const deleteBroker = useCallback(
    async (id: string) => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const userId = session?.user?.id
      const { error } = await supabase
        .from('brokers')
        .delete()
        .eq('id', id)
        .eq('user_id', userId ?? '')
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
