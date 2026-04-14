import { Slot, useRouter, useSegments } from 'expo-router'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Session } from '@supabase/supabase-js'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { HeroUINativeProvider } from 'heroui-native/provider'
import { QueryClientProvider } from '@tanstack/react-query'
import { SettingsProvider, useSettings } from '../lib/settingsContext'
import { queryClient } from '../lib/queryClient'
import '../lib/i18n'
import '../global.css'

/** Inner content — runs *inside* `SettingsProvider` so it can gate on
 *  `isLoaded`. Without this gate, the first paint uses the default locale
 *  and theme before AsyncStorage resolves, producing a visible flash for
 *  users who've pinned a non-default preference. */
function AppContent({ initialized, session }: { initialized: boolean; session: Session | null }) {
  const { isLoaded } = useSettings()
  const router = useRouter()
  const segments = useSegments()

  useEffect(() => {
    if (!initialized) return
    const inAuth = segments[0] === '(auth)'
    if (!session && !inAuth) router.replace('/(auth)/login')
    else if (session && inAuth) router.replace('/(app)/(dashboard)')
  }, [session, initialized, segments, router])

  if (!initialized || !isLoaded) return null

  return (
    <HeroUINativeProvider>
      <Slot />
    </HeroUINativeProvider>
  )
}

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null)
  const [initialized, setInitialized] = useState(false)

  // Subscribe to auth state once. This is a bridge to an external system
  // (Supabase's session listener) — that's the one useEffect case that
  // *does* belong, per the React "you might not need an effect" rules.
  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) console.error('[_layout] getSession error:', error.message)
        setSession(data.session)
        setInitialized(true)
      })
      .catch(e => {
        console.error('[_layout] getSession threw:', e)
        setInitialized(true)
      })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  return (
    <GestureHandlerRootView className="flex-1">
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <SettingsProvider>
            <AppContent initialized={initialized} session={session} />
          </SettingsProvider>
        </SafeAreaProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  )
}
