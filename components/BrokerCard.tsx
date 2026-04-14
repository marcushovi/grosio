import { View, Text, Pressable } from 'react-native'
import { Card } from 'heroui-native/card'
import { useThemeColor } from 'heroui-native'
import { TrendingUp, TrendingDown } from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import type { Broker } from '../types'
import { formatAmount, formatGainLoss } from '../lib/currency'
import { useSettings } from '../lib/settingsContext'
import { useT } from '../lib/t'

interface BrokerCardProps {
  broker: Broker
  totalValue: number
  gainLoss: number
  gainLossPct: number
  positionCount: number
  onPress: () => void
  onLongPress: () => void
}

export function BrokerCard({
  broker,
  totalValue,
  gainLoss,
  gainLossPct,
  positionCount,
  onPress,
  onLongPress,
}: BrokerCardProps) {
  const { currency } = useSettings()
  const { _ } = useT()
  const [success, danger] = useThemeColor(['success', 'danger'])
  const isPositive = gainLoss >= 0

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        onPress()
      }}
      onLongPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
        onLongPress()
      }}
      className="mb-3"
    >
      <Card className="bg-surface">
        <Card.Body>
          <View className="flex-row items-center mb-3">
            <View className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: broker.color }} />
            <Text className="flex-1 text-foreground text-lg font-semibold">{broker.name}</Text>
            <Text className="text-muted text-sm">
              {positionCount} {_('positions')}
            </Text>
          </View>
          <Text className="text-foreground text-3xl font-bold mb-1">
            {formatAmount(totalValue, currency)}
          </Text>
          <View className="flex-row items-center gap-2">
            {isPositive ? (
              <TrendingUp size={14} color={success} />
            ) : (
              <TrendingDown size={14} color={danger} />
            )}
            <Text
              className={
                isPositive
                  ? 'text-success text-sm font-semibold'
                  : 'text-danger text-sm font-semibold'
              }
            >
              {formatGainLoss(gainLoss, gainLossPct, currency)}
            </Text>
          </View>
        </Card.Body>
      </Card>
    </Pressable>
  )
}
