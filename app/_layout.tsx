import { Stack } from 'expo-router'
import type { ErrorBoundaryProps } from 'expo-router'
import { View, Text, Pressable } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { HeroUINativeProvider } from 'heroui-native/provider'
import { QueryClientProvider } from '@tanstack/react-query'
import { SettingsProvider } from '@/lib/settingsContext'
import { SessionProvider, useSession } from '@/lib/sessionContext'
import { queryClient } from '@/lib/queryClient'
import { SplashScreenController } from '@/components/SplashScreenController'
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

function RootNavigator() {
  const { session } = useSession()
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  )
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView className="flex-1">
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <SessionProvider>
            <SettingsProvider>
              <HeroUINativeProvider>
                <SplashScreenController />
                <RootNavigator />
              </HeroUINativeProvider>
            </SettingsProvider>
          </SessionProvider>
        </SafeAreaProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  )
}
