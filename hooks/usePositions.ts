import { useState, useEffect, useCallback } from 'react'
import { supabase, getAuthUserId } from '../lib/supabase'
import type { Position } from '../types'

export function usePositions(brokerId?: string) {
  const [positions, setPositions] = useState<Position[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPositions = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      let query = supabase.from('positions').select('*').order('created_at', { ascending: true })
      if (brokerId) query = query.eq('broker_id', brokerId)
      const { data, error: fetchErr } = await query
      if (fetchErr) throw fetchErr
      setPositions(data || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load positions')
    } finally {
      setLoading(false)
    }
  }, [brokerId])

  const addPosition = useCallback(
    async (position: {
      broker_id: string
      symbol: string
      name: string
      shares: number
      avg_buy_price: number
      currency: string
    }) => {
      const userId = await getAuthUserId()
      if (!userId) return { error: { message: 'Not authenticated' } }
      const { error } = await supabase.from('positions').insert({ ...position, user_id: userId })
      if (!error) await fetchPositions()
      return { error }
    },
    [fetchPositions]
  )

  const deletePosition = useCallback(
    async (id: string) => {
      const userId = await getAuthUserId()
      if (!userId) return { error: { message: 'Not authenticated' } }
      const { error } = await supabase.from('positions').delete().eq('id', id).eq('user_id', userId)
      if (!error) await fetchPositions()
      return { error }
    },
    [fetchPositions]
  )

  useEffect(() => {
    fetchPositions()
  }, [fetchPositions])

  return { positions, loading, error, addPosition, deletePosition, refetch: fetchPositions }
}
