import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Broker } from '../types'

export function useBrokers() {
  const [brokers, setBrokers] = useState<Broker[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchBrokers = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('brokers')
      .select('*')
      .order('created_at', { ascending: true })
    if (error) setError(error.message)
    else setBrokers(data || [])
    setLoading(false)
  }

  const addBroker = async (name: string, color: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }
    const { error } = await supabase.from('brokers').insert({ name, color, user_id: user.id })
    if (!error) await fetchBrokers()
    return { error }
  }

  const deleteBroker = async (id: string) => {
    const { error } = await supabase.from('brokers').delete().eq('id', id)
    if (!error) await fetchBrokers()
    return { error }
  }

  useEffect(() => {
    fetchBrokers()
  }, [])

  return { brokers, loading, error, addBroker, deleteBroker, refetch: fetchBrokers }
}
