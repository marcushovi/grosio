import { Slot, useRouter, useSegments } from 'expo-router'
import type { ErrorBoundaryProps } from 'expo-router'
import { useEffect, useState } from 'react'
import { View, Text, Pressable } from 'react-native'
import { supabase } from '@/lib/supabase'
import type { Session } from '@supabase/supabase-js'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { HeroUINativeProvider } from 'heroui-native/provider'
import { QueryClientProvider } from '@tanstack/react-query'
import { SettingsProvider, useSettings } from '@/lib/settingsContext'
import { queryClient } from '@/lib/queryClient'
import '../lib/i18n'
import '../global.css'

// Expo Router fallback when a child route throws during render.
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <View className="flex-1 items-center justify-center bg-background px-6">
      <Text className="text-foreground text-2xl font-bold mb-2">Something went wrong</Text>
      <Text className="text-muted text-sm text-center mb-6">{error.message}</Text>
      <Pressable
        onPress={retry}
        className="bg-accent rounded-xl px-5 py-3"
        accessibilityRole="button"
      >
        <Text className="text-accent-foreground font-semibold">Try again</Text>
      </Pressable>
    </View>
  )
}

// Inner content runs inside SettingsProvider so it can gate on `isLoaded`.
// Without the gate the first paint uses default locale/theme before
// AsyncStorage resolves, causing a visible flash.
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
