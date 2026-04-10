import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { Position } from '../types'

export function usePositions(brokerId?: string) {
  const [positions, setPositions] = useState<Position[]>([])
  const [loading, setLoading] = useState(true)

  const fetchPositions = useCallback(async () => {
    setLoading(true)
    let query = supabase.from('positions').select('*').order('created_at', { ascending: true })
    if (brokerId) query = query.eq('broker_id', brokerId)
    const { data, error } = await query
    if (error) {
      setLoading(false)
      return
    }
    setPositions(data || [])
    setLoading(false)
  }, [brokerId])

  const addPosition = async (position: {
    broker_id: string
    symbol: string
    name: string
    shares: number
    avg_buy_price: number
    currency: string
  }) => {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) return { error: { message: 'Not authenticated' } }
    const { error } = await supabase.from('positions').insert({ ...position, user_id: user.id })
    if (!error) await fetchPositions()
    return { error }
  }

  const deletePosition = async (id: string) => {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    const userId = session?.user?.id
    const { error } = await supabase
      .from('positions')
      .delete()
      .eq('id', id)
      .eq('user_id', userId ?? '')
    if (!error) await fetchPositions()
    return { error }
  }

  useEffect(() => {
    fetchPositions()
  }, [fetchPositions])

  return { positions, loading, addPosition, deletePosition, refetch: fetchPositions }
}
