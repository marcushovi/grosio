import { Slot, useRouter, useSegments } from 'expo-router'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Session } from '@supabase/supabase-js'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { HeroUINativeProvider } from 'heroui-native/provider'
import { QueryClientProvider } from '@tanstack/react-query'
import { SettingsProvider } from '../lib/settingsContext'
import { queryClient } from '../lib/queryClient'
import '../lib/i18n'
import '../global.css'

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null)
  const [initialized, setInitialized] = useState(false)
  const router = useRouter()
  const segments = useSegments()

  // Subscribe to auth state once. This is a bridge to an external system
  // (Supabase's session listener) — that's the one useEffect case that
  // *does* belong, per the React "you might not need an effect" rules.
  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        setSession(session)
        setInitialized(true)
      })
      .catch(() => setInitialized(true))

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!initialized) return
    const inAuth = segments[0] === '(auth)'
    if (!session && !inAuth) router.replace('/(auth)/login')
    else if (session && inAuth) router.replace('/(app)/(dashboard)')
  }, [session, initialized, segments, router])

  if (!initialized) return null

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <SettingsProvider>
            <HeroUINativeProvider>
              <Slot />
            </HeroUINativeProvider>
          </SettingsProvider>
        </SafeAreaProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  )
}
