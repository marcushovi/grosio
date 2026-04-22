import { View, Text } from 'react-native'
import { useT } from '@/lib/t'

interface ErrorStateProps {
  message: string
  onRetry: () => void
  /** Override the default `tryAgain` label. */
  retryLabel?: string
}

/** Centred error message with a retry action. Fills its parent. */
export function ErrorState({ message, onRetry, retryLabel }: ErrorStateProps) {
  const { _ } = useT()
  return (
    <View className="flex-1 items-center justify-center px-6 gap-3">
      <Text className="text-danger text-center">{message}</Text>
      <Text className="text-accent font-semibold" onPress={onRetry}>
        {retryLabel ?? _('tryAgain')}
      </Text>
    </View>
  )
}
