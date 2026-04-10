import { Stack } from 'expo-router'
import { View, Text, Pressable } from 'react-native'
import { ErrorBoundaryProps } from 'expo-router'

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <>
      <Stack.Screen options={{ title: 'Chyba' }} />
      <View className="flex-1 bg-background items-center justify-center p-6 gap-4">
        <Text className="text-danger text-xl font-semibold text-center">
          Nastala neočakávaná chyba
        </Text>
        <Text className="text-foreground-500 text-sm text-center">{error.message}</Text>
        <Pressable onPress={retry} className="bg-primary rounded-xl px-6 py-3">
          <Text className="text-primary-foreground font-semibold">Skúsiť znova</Text>
        </Pressable>
      </View>
    </>
  )
}
