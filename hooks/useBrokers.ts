import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, getAuthUserId } from '../lib/supabase'
import type { Broker } from '../types'

export function useBrokers() {
  const queryClient = useQueryClient()

  const {
    data: brokers = [],
    isPending: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['brokers'],
    queryFn: async () => {
      const { data, error: fetchErr } = await supabase
        .from('brokers')
        .select('*')
        .order('created_at', { ascending: true })
      if (fetchErr) throw fetchErr
      return (data || []) as Broker[]
    },
  })

  const addBrokerMutation = useMutation({
    mutationFn: async ({ name, color }: { name: string; color: string }) => {
      const userId = await getAuthUserId()
      if (!userId) throw new Error('Not authenticated')
      const { error } = await supabase.from('brokers').insert({ name, color, user_id: userId })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brokers'] })
    },
  })

  const deleteBrokerMutation = useMutation({
    mutationFn: async (id: string) => {
      const userId = await getAuthUserId()
      if (!userId) throw new Error('Not authenticated')
      const { error } = await supabase.from('brokers').delete().eq('id', id).eq('user_id', userId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brokers'] })
    },
  })

  // Exposing the original API signature so dependent components don't immediately break
  return {
    brokers,
    loading,
    error: error?.message || null,
    addBroker: async (name: string, color: string) => {
      try {
        await addBrokerMutation.mutateAsync({ name, color })
        return { error: null }
      } catch (e) {
        return { error: e as Error }
      }
    },
    deleteBroker: async (id: string) => {
      try {
        await deleteBrokerMutation.mutateAsync(id)
        return { error: null }
      } catch (e) {
        return { error: e as Error }
      }
    },
    refetch,
  }
}
