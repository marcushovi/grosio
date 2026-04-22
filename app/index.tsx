import { Redirect } from 'expo-router'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function Index() {
  const [target, setTarget] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setTarget(data.session ? '/(app)/(dashboard)' : '/(auth)/login')
    })
  }, [])

  if (!target) return null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <Redirect href={target as any} />
}
