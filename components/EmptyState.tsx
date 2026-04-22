import { View, Text } from 'react-native'
import { useThemeColor } from 'heroui-native'
import { Button } from 'heroui-native/button'
import type { LucideIcon } from 'lucide-react-native'

interface EmptyStateProps {
  title: string
  subtitle?: string
  icon?: LucideIcon
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({
  title,
  subtitle,
  icon: Icon,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  const muted = useThemeColor('muted') as string
  return (
    <View className="flex-1 items-center justify-center px-8 gap-3">
      {Icon && <Icon size={48} color={muted} />}
      <Text className="text-foreground text-lg font-semibold text-center">{title}</Text>
      {subtitle && <Text className="text-muted text-sm text-center">{subtitle}</Text>}
      {actionLabel && onAction && (
        <Button variant="primary" size="md" onPress={onAction} className="mt-2">
          <Button.Label>{actionLabel}</Button.Label>
        </Button>
      )}
    </View>
  )
}
