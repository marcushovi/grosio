import { useState } from 'react'
import { View, Text, Pressable, Alert, LayoutAnimation, Platform, UIManager } from 'react-native'
import { Card } from 'heroui-native/card'
import { Chip } from 'heroui-native/chip'
import { useTranslation } from 'react-i18next'
import { useFormat } from '@/hooks/useFormat'
import { useUnsellPosition } from '@/hooks/usePositions'
import { computeRealizedTaxStatus, realizedPnlNative, type Domicile } from '@/lib/tax'
import { toEur, convertToDisplay, type ExchangeRates, type DisplayCurrency } from '@/lib/currency'
import type { Position } from '@/types'

// LayoutAnimation on Android needs this opt-in. iOS has it on by default.
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

interface RealizedPositionCardProps {
  position: Position
  domicile: Domicile
  rates: ExchangeRates
  displayCurrency: DisplayCurrency
}

export function RealizedPositionCard({
  position,
  domicile,
  rates,
  displayCurrency,
}: RealizedPositionCardProps) {
  const { t: _ } = useTranslation()
  const f = useFormat()
  const [expanded, setExpanded] = useState(false)
  const unsellPositionMutation = useUnsellPosition()

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setExpanded(v => !v)
  }

  const handleLongPress = () => {
    Alert.alert(_('unsellPosition'), _('unsellPositionMsg', { symbol: position.symbol }), [
      { text: _('cancel'), style: 'cancel' },
      {
        text: _('unsell'),
        onPress: async () => {
          try {
            await unsellPositionMutation.mutateAsync(position.id)
            Alert.alert(_('unsellSuccess', { symbol: position.symbol }))
          } catch (e) {
            Alert.alert(_('error'), e instanceof Error ? e.message : String(e))
          }
        },
      },
    ])
  }

  const { isTaxFree, daysHeld } = computeRealizedTaxStatus(position, domicile)
  const pnlNative = realizedPnlNative(position)
  const pnlDisplay =
    pnlNative === null
      ? 0
      : convertToDisplay(toEur(pnlNative, position.currency, rates), displayCurrency, rates)

  return (
    <Pressable onPress={toggle} onLongPress={handleLongPress} delayLongPress={400}>
      <Card className="bg-surface p-4 mb-2">
        <View className="flex-row items-center gap-2">
          <Text className="text-foreground font-semibold">{position.symbol}</Text>
          <Text className="text-muted text-xs flex-1" numberOfLines={1}>
            {position.name}
          </Text>
        </View>

        {position.sold_at && (
          <Text className="text-muted text-xs mt-1">
            {_('sellLabel')} {f.formatDate(position.sold_at)}
          </Text>
        )}

        <View className="flex-row items-center justify-between mt-2">
          <Text
            className={
              pnlDisplay >= 0
                ? 'text-success text-base font-semibold'
                : 'text-danger text-base font-semibold'
            }
          >
            {f.formatSignedCurrency(pnlDisplay, displayCurrency)}
          </Text>
          {isTaxFree !== null && (
            <Chip variant="soft" color={isTaxFree ? 'success' : 'warning'} size="sm">
              <Chip.Label>{isTaxFree ? _('taxFreeChip') : _('taxableChip')}</Chip.Label>
            </Chip>
          )}
        </View>

        {expanded && (
          <View className="mt-3 pt-3 border-t border-border gap-1">
            {position.buy_date && (
              <View className="flex-row justify-between">
                <Text className="text-muted text-xs">
                  {_('buyLabel')}: {f.formatDate(position.buy_date)}
                </Text>
                <Text className="text-foreground text-xs">
                  {position.shares}× {f.formatCurrency(position.buy_price, position.currency)}
                </Text>
              </View>
            )}
            {position.sold_at && position.sold_shares !== null && position.sold_price !== null && (
              <View className="flex-row justify-between">
                <Text className="text-muted text-xs">
                  {_('sellLabel')}: {f.formatDate(position.sold_at)}
                </Text>
                <Text className="text-foreground text-xs">
                  {position.sold_shares}× {f.formatCurrency(position.sold_price, position.currency)}
                </Text>
              </View>
            )}
            {daysHeld !== null && (
              <Text className="text-muted text-xs">
                {_('holdingPeriod')}: {daysHeld} {_('days')}
              </Text>
            )}
          </View>
        )}
      </Card>
    </Pressable>
  )
}
