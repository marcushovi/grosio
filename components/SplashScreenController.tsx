import { useEffect } from 'react'
import { SplashScreen } from 'expo-router'
import { useSession } from '@/lib/sessionContext'
import { useSettings } from '@/lib/settingsContext'

SplashScreen.preventAutoHideAsync()

// Hide the native splash once both session and settings have hydrated.
// Stack.Protected gates routing in the same render, so the user lands on
// the right screen with no flicker.
export function SplashScreenController() {
  const { isLoading: sessionLoading } = useSession()
  const { isLoaded: settingsLoaded } = useSettings()
  const ready = !sessionLoading && settingsLoaded
  useEffect(() => {
    if (!ready) return
    SplashScreen.hideAsync().catch(() => {})
  }, [ready])
  return null
}
