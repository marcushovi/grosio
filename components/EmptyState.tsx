import { View, Text } from 'react-native'
import { useThemeColor } from 'heroui-native'
import { Button } from 'heroui-native/button'
import type { LucideIcon } from 'lucide-react-native'

interface EmptyStateProps {
  title: string
  subtitle?: string
  /** Optional illustration — rendered at 48px above the title. */
  icon?: LucideIcon
  /** Optional CTA button label. Renders a primary button under the subtitle. */
  actionLabel?: string
  onAction?: () => void
}

/** Centred empty-state message with an optional icon and CTA. Fills its parent. */
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
