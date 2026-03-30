import { Pressable, View, Text } from 'react-native'
import { Card } from 'heroui-native/card'
import { Broker } from '../types'

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
  const isPositive = gainLoss >= 0

  return (
    <Pressable onPress={onPress} onLongPress={onLongPress}>
      <Card className="bg-surface p-5 mb-3">
        <View className="flex-row items-center mb-3">
          <View className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: broker.color }} />
          <Text className="flex-1 text-foreground text-lg font-semibold">{broker.name}</Text>
          <Text className="text-muted text-sm">{positionCount} pozícií</Text>
        </View>
        <Text className="text-foreground text-3xl font-bold mb-1">€{totalValue.toFixed(2)}</Text>
        <Text
          className={
            isPositive ? 'text-success text-base font-medium' : 'text-danger text-base font-medium'
          }
        >
          {isPositive ? '+' : ''}
          {gainLoss.toFixed(2)} €
        </Text>
      </Card>
    </Pressable>
  )
}
