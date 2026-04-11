import { Pressable, View, Text } from 'react-native'
import { Card } from 'heroui-native/card'
import type { Broker } from '../types'
import { formatAmount } from '../lib/currency'
import { useSettings } from '../lib/settingsContext'
import { useT } from '../lib/t'

interface BrokerCardProps {
  broker: Broker
  totalValue: number
  gainLoss: number
  positionCount: number
  onPress: () => void
  onLongPress: () => void
}

export function BrokerCard({
  broker,
  totalValue,
  gainLoss,
  positionCount,
  onPress,
  onLongPress,
}: BrokerCardProps) {
  const { currency } = useSettings()
  const { _ } = useT()
  const isPositive = gainLoss >= 0

  return (
    <Pressable onPress={onPress} onLongPress={onLongPress}>
      <Card className="bg-surface mb-3">
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
          <Text
            className={
              isPositive
                ? 'text-success text-base font-medium'
                : 'text-danger text-base font-medium'
            }
          >
            {isPositive ? '+' : ''}
            {formatAmount(gainLoss, currency)}
          </Text>
        </Card.Body>
      </Card>
    </Pressable>
  )
}
