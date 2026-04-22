import { View, Text } from 'react-native'
import { useTranslation } from 'react-i18next'

interface ErrorStateProps {
  message: string
  onRetry: () => void
  retryLabel?: string
}

export function ErrorState({ message, onRetry, retryLabel }: ErrorStateProps) {
  const { t: _ } = useTranslation()
  return (
    <View className="flex-1 items-center justify-center px-6 gap-3">
      <Text className="text-danger text-center">{message}</Text>
      <Text className="text-accent font-semibold" onPress={onRetry}>
        {retryLabel ?? _('tryAgain')}
      </Text>
    </View>
  )
}
