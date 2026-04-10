import { Link, Stack } from 'expo-router'
import { View, Text } from 'react-native'

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Stránka nenájdená' }} />
      <View className="flex-1 bg-background items-center justify-center p-6 gap-4">
        <Text className="text-foreground text-xl font-semibold text-center">
          Táto stránka neexistuje.
        </Text>
        <Link href="/(app)/dashboard" className="text-primary text-base">
          Späť na hlavnú stránku
        </Link>
      </View>
    </>
  )
}
