import type { ErrorBoundaryProps } from 'expo-router'
import { View, Text, Pressable } from 'react-native'
import { useT } from '../../lib/t'
import { Screen } from '../../components/Screen'

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const { _ } = useT()
  return (
    <Screen>
      <View className="flex-1 items-center justify-center px-6 gap-4">
        <Text className="text-danger text-center text-base">{_('unexpectedError')}</Text>
        <Text className="text-muted text-center text-sm">{error.message}</Text>
        <Pressable
          onPress={retry}
          className="bg-accent rounded-xl px-6 py-3"
          accessibilityRole="button"
          accessibilityLabel={_('tryAgain')}
        >
          <Text className="text-accent-foreground font-semibold">{_('tryAgain')}</Text>
        </Pressable>
      </View>
    </Screen>
  )
}

export default ErrorBoundary
