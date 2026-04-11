import { useState, useEffect, useCallback } from 'react'
import { View, Text, FlatList, Alert, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Card } from 'heroui-native/card'
import { Button } from 'heroui-native/button'
import { useThemeColor } from 'heroui-native'
import { ArrowLeft, Plus, TrendingUp, TrendingDown, Trash2 } from 'lucide-react-native'
import { useBrokers } from '../../../hooks/useBrokers'
import { usePositions } from '../../../hooks/usePositions'
import { usePrices } from '../../../hooks/usePrices'
import {
  getExchangeRates,
  toEur,
  convertToDisplay,
  formatAmount,
  formatRaw,
  formatGainLoss,
} from '../../../lib/currency'
import { useSettings } from '../../../lib/settingsContext'
import { useT } from '../../../lib/t'
import { AddPositionDialog } from '../../../components/AddPositionDialog'
import type { PositionWithPrice } from '../../../types'

export default function BrokerDetailScreen() {
  const { _ } = useT()
  const { currency: displayCurrency } = useSettings()
  const [success, danger, foreground, accentFg] = useThemeColor([
    'success',
    'danger',
    'foreground',
    'accent-foreground',
  ])
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { brokers, loading: brokersLoading } = useBrokers()
  const { positions, loading, addPosition, deletePosition } = usePositions(id)
  const { fetchPrices: fetchPricesFromHook } = usePrices()
  const broker = brokers.find(b => b.id === id)

  const [positionsWithPrices, setPositionsWithPrices] = useState<PositionWithPrice[]>([])
  const [pricesLoading, setPricesLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)

  const fetchPrices = useCallback(async () => {
    if (positions.length === 0) {
      setPositionsWithPrices([])
      return
    }
    setPricesLoading(true)
    try {
      const rates = await getExchangeRates()
      const symbols = [...new Set(positions.map(p => p.symbol))]
      const prices = await fetchPricesFromHook(symbols)

      setPositionsWithPrices(
        positions.map(pos => {
          const quote = prices[pos.symbol]
          const rawPrice = quote?.price ?? pos.avg_buy_price
          const currency = quote?.currency ?? pos.currency
          const valueEur = toEur(pos.shares * rawPrice, currency, rates)
          const costEur = toEur(pos.shares * pos.avg_buy_price, pos.currency, rates)
          const currentValue = convertToDisplay(valueEur, displayCurrency, rates)
          const invested = convertToDisplay(costEur, displayCurrency, rates)
          const gainLoss = currentValue - invested
          return {
            id: pos.id,
            broker_id: pos.broker_id,
            user_id: pos.user_id,
            symbol: pos.symbol,
            name: pos.name,
            shares: pos.shares,
            avg_buy_price: pos.avg_buy_price,
            currency,
            currentPrice: rawPrice,
            currentValue,
            invested,
            gainLoss,
            gainLossPct: invested > 0 ? (gainLoss / invested) * 100 : 0,
          }
        })
      )
    } catch {
      // fall back to showing positions without live prices
    } finally {
      setPricesLoading(false)
    }
  }, [positions, fetchPricesFromHook, displayCurrency])

  useEffect(() => {
    fetchPrices()
  }, [fetchPrices])

  const handleDeletePosition = useCallback(
    (posId: string, symbol: string) => {
      Alert.alert(_('deletePosition'), _('deletePositionMsg', { symbol }), [
        { text: _('cancel'), style: 'cancel' },
        {
          text: _('delete'),
          style: 'destructive',
          onPress: async () => {
            const { error } = await deletePosition(posId)
            if (error) Alert.alert(_('error'), typeof error === 'string' ? error : error.message)
          },
        },
      ])
    },
    [_, deletePosition]
  )

  const handleAddPosition = useCallback(
    async (pos: {
      symbol: string
      name: string
      shares: number
      avg_buy_price: number
      currency: string
    }) => {
      if (typeof id !== 'string') return { error: { message: 'Invalid broker' } }
      return addPosition({ broker_id: id, ...pos })
    },
    [addPosition, id]
  )

  const totalValue = positionsWithPrices.reduce((s, p) => s + p.currentValue, 0)
  const totalInvested = positionsWithPrices.reduce((s, p) => s + p.invested, 0)
  const totalGL = totalValue - totalInvested
  const totalGLPct = totalInvested > 0 ? (totalGL / totalInvested) * 100 : 0
  const isGain = totalGL >= 0

  if (!id || (!broker && !brokersLoading)) {
    return (
      <SafeAreaView className="flex-1 bg-background justify-center items-center">
        <Text className="text-muted">{_('brokerNotFound')}</Text>
      </SafeAreaView>
    )
  }

  if (!broker) {
    return <SafeAreaView className="flex-1 bg-background" />
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="px-5 pt-2 pb-4 flex-row items-center gap-3">
        <Button variant="ghost" size="sm" isIconOnly onPress={() => router.back()}>
          <ArrowLeft color={foreground} size={20} />
        </Button>
        <View className="w-3 h-3 rounded-full" style={{ backgroundColor: broker.color }} />
        <Text className="text-foreground text-2xl font-bold flex-1">{broker.name}</Text>
        <Button variant="primary" size="sm" onPress={() => setDialogOpen(true)}>
          <Plus color={accentFg} size={16} />
          <Button.Label>{_('position')}</Button.Label>
        </Button>
      </View>

      {/* Summary */}
      <View className="px-5 mb-4">
        <Card className="bg-surface p-5">
          <Text className="text-muted text-sm mb-1">{_('totalValueLabel')}</Text>
          <Text className="text-foreground text-3xl font-bold mb-1">
            {formatAmount(totalValue, displayCurrency)}
          </Text>
          <View className="flex-row items-center gap-2">
            {isGain ? (
              <TrendingUp size={14} color={success} />
            ) : (
              <TrendingDown size={14} color={danger} />
            )}
            <Text
              className={
                isGain ? 'text-success text-sm font-semibold' : 'text-danger text-sm font-semibold'
              }
            >
              {formatGainLoss(totalGL, totalGLPct, displayCurrency)}
            </Text>
          </View>
        </Card>
      </View>

      {/* Positions */}
      {(loading || pricesLoading) && positionsWithPrices.length === 0 ? (
        <View className="flex-1 justify-center items-center" />
      ) : positionsWithPrices.length === 0 && !loading ? (
        <View className="flex-1 justify-center items-center">
          <Text className="text-foreground text-lg mb-2">{_('noPositions')}</Text>
          <Text className="text-muted text-sm">{_('addFirstPosition')}</Text>
        </View>
      ) : (
        <FlatList
          data={positionsWithPrices}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={pricesLoading} onRefresh={fetchPrices} />}
          renderItem={({ item }) => {
            const isItemGain = item.gainLoss >= 0
            return (
              <Card className="bg-surface p-4 mb-2">
                <View className="flex-row items-center">
                  <View className="flex-1">
                    <Text className="text-foreground font-semibold text-base">{item.symbol}</Text>
                    <Text className="text-muted text-xs">{item.name}</Text>
                    <Text className="text-muted text-xs mt-1">
                      {item.shares}× {formatRaw(item.avg_buy_price, item.currency)}
                    </Text>
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
                    onPress={() => handleDeletePosition(item.id, item.symbol)}
                  >
                    <Trash2 color={danger} size={16} />
                  </Button>
                </View>
              </Card>
            )
          }}
        />
      )}

      <AddPositionDialog
        isOpen={dialogOpen}
        onOpenChange={setDialogOpen}
        onAdd={handleAddPosition}
      />
    </SafeAreaView>
  )
}
