import { memo } from 'react'
import { View, Text } from 'react-native'
import { Card } from 'heroui-native/card'
import { useFormat } from '../hooks/useFormat'
import type { DisplayCurrency } from '../lib/currency'
import type { PositionWithPrice } from '../types'

interface PositionRowProps {
  item: PositionWithPrice
  displayCurrency: DisplayCurrency
}

export const PositionRow = memo(function PositionRow({ item, displayCurrency }: PositionRowProps) {
  const f = useFormat()
  const isItemGain = item.gainLoss >= 0
  return (
    <Card className="bg-surface p-4 mb-2">
      <View className="flex-row items-center">
        <View className="flex-1">
          <Text className="text-foreground font-semibold text-base">{item.symbol}</Text>
          <Text className="text-muted text-xs">{item.name}</Text>
          <Text className="text-muted text-xs mt-1">
            {item.shares}× {f.formatCurrency(item.buy_price, item.currency)}
          </Text>
          {item.buy_date && (
            <Text className="text-muted text-xs">{f.formatDate(item.buy_date)}</Text>
          )}
        </View>
        <View className="items-end">
          <Text className="text-foreground font-semibold">
            {f.formatCurrency(item.currentValue, displayCurrency)}
          </Text>
          <Text
            className={
              isItemGain ? 'text-success text-xs font-medium' : 'text-danger text-xs font-medium'
            }
          >
            {f.formatSignedCurrency(item.gainLoss, displayCurrency)} (
            {f.formatPercent(item.gainLossPct, { asPercent: true })})
          </Text>
          <Text className="text-muted text-xs">
            {f.formatCurrency(item.currentPrice, item.currency)}
          </Text>
        </View>
      </View>
    </Card>
  )
})
