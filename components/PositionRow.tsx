import { memo } from 'react'
import { View, Text } from 'react-native'
import { Card } from 'heroui-native/card'
import { Button } from 'heroui-native/button'
import { Trash2 } from 'lucide-react-native'
import { formatAmount, formatRaw, formatGainLoss } from '../lib/api/currency'
import type { DisplayCurrency } from '../lib/currency'
import type { PositionWithPrice } from '../types'
import { useT } from '../lib/t'

interface PositionRowProps {
  item: PositionWithPrice
  displayCurrency: DisplayCurrency
  dangerColor: string
  onDelete: (id: string, symbol: string) => void
}

export const PositionRow = memo(function PositionRow({
  item,
  displayCurrency,
  dangerColor,
  onDelete,
}: PositionRowProps) {
  const { _ } = useT()
  const isItemGain = item.gainLoss >= 0
  return (
    <Card className="bg-surface p-4 mb-2">
      <View className="flex-row items-center">
        <View className="flex-1">
          <Text className="text-foreground font-semibold text-base">{item.symbol}</Text>
          <Text className="text-muted text-xs">{item.name}</Text>
          <Text className="text-muted text-xs mt-1">
            {item.shares}× {formatRaw(item.buy_price, item.currency)}
          </Text>
          {item.buy_date && <Text className="text-muted text-xs">{item.buy_date}</Text>}
        </View>
        <View className="items-end mr-3">
          <Text className="text-foreground font-semibold">
            {formatAmount(item.currentValue, displayCurrency)}
          </Text>
          <Text
            className={
              isItemGain
                ? 'text-success text-xs font-medium'
                : 'text-danger text-xs font-medium'
            }
          >
            {formatGainLoss(item.gainLoss, item.gainLossPct, displayCurrency)}
          </Text>
          <Text className="text-muted text-xs">
            {formatRaw(item.currentPrice, item.currency)}
          </Text>
        </View>
        <Button
          variant="ghost"
          size="sm"
          isIconOnly
          onPress={() => onDelete(item.id, item.symbol)}
          accessibilityLabel={_('deletePosition')}
        >
          <Trash2 color={dangerColor} size={16} />
        </Button>
      </View>
    </Card>
  )
})
