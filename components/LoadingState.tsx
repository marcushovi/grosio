import { View, ActivityIndicator } from 'react-native'
import { useThemeColor } from 'heroui-native'

export function LoadingState() {
  const accent = useThemeColor('accent') as string
  return (
    <View className="flex-1 items-center justify-center">
      <ActivityIndicator color={accent} />
    </View>
  )
}
