import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, getAuthUserId } from '../lib/supabase'
import type { Position } from '../types'

export function usePositions(brokerId?: string) {
  const queryClient = useQueryClient()

  const {
    data: positions = [],
    isPending: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['positions', brokerId],
    queryFn: async () => {
      let query = supabase.from('positions').select('*').order('created_at', { ascending: true })
      if (brokerId) query = query.eq('broker_id', brokerId)
      const { data, error: fetchErr } = await query
      if (fetchErr) throw fetchErr
      return (data || []) as Position[]
    },
  })

  const addPositionMutation = useMutation({
    mutationFn: async (position: {
      broker_id: string
      symbol: string
      name: string
      shares: number
      avg_buy_price: number
      currency: string
      buy_date: string // 'YYYY-MM-DD'
    }) => {
      const userId = await getAuthUserId()
      if (!userId) throw new Error('Not authenticated')
      const { error } = await supabase.from('positions').insert({ ...position, user_id: userId })
      if (error) throw error
    },
    // Await invalidation so the mutation resolves only after derived caches are refreshed.
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['positions'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboardData'] }),
        queryClient.invalidateQueries({ queryKey: ['portfolioHistoryEur'] }),
      ])
    },
  })

  const deletePositionMutation = useMutation({
    mutationFn: async (id: string) => {
      const userId = await getAuthUserId()
      if (!userId) throw new Error('Not authenticated')
      const { error } = await supabase.from('positions').delete().eq('id', id).eq('user_id', userId)
      if (error) throw error
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['positions'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboardData'] }),
        queryClient.invalidateQueries({ queryKey: ['portfolioHistoryEur'] }),
      ])
    },
  })

  return {
    positions,
    loading,
    error: error?.message || null,
    addPosition: async (position: {
      broker_id: string
      symbol: string
      name: string
      shares: number
      avg_buy_price: number
      currency: string
      buy_date: string
    }) => {
      try {
        await addPositionMutation.mutateAsync(position)
        return { error: null }
      } catch (e) {
        return { error: e as Error }
      }
    },
    deletePosition: async (id: string) => {
      try {
        await deletePositionMutation.mutateAsync(id)
        return { error: null }
      } catch (e) {
        return { error: e as Error }
      }
    },
    refetch,
  }
}
