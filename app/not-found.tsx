import { Link, Stack } from 'expo-router'
import { View, Text } from 'react-native'
import { useT } from '../lib/t'

export default function NotFoundScreen() {
  const { _ } = useT()

  return (
    <>
      <Stack.Screen options={{ title: _('pageNotFound') }} />
      <View className="flex-1 bg-background items-center justify-center p-6 gap-4">
        <Text className="text-foreground text-xl font-semibold text-center">
          {_('pageNotFound')}
        </Text>
        <Link href="/(app)/dashboard" className="text-accent text-base">
          {_('backHome')}
        </Link>
      </View>
    </>
  )
}
