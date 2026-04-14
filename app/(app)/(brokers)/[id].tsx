import { useCallback, useMemo, useState } from 'react'
import { View, Text, FlatList, Alert, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { Card } from 'heroui-native/card'
import { Button } from 'heroui-native/button'
import { useThemeColor } from 'heroui-native'
import { ArrowLeft, Plus, TrendingUp, TrendingDown, Trash2 } from 'lucide-react-native'
import { useBrokers } from '../../../hooks/useBrokers'
import { usePositions } from '../../../hooks/usePositions'
import { queryKeys } from '../../../lib/queryKeys'
import { fetchPrices, type PriceMap } from '../../../lib/api/prices'
import {
  getExchangeRates,
  formatAmount,
  formatRaw,
  formatGainLoss,
} from '../../../lib/api/currency'
import type { ExchangeRates } from '../../../lib/currency'
import { computePositionValueEur, computePositionPnl } from '../../../lib/portfolio'
import { useSettings } from '../../../lib/settingsContext'
import { useT } from '../../../lib/t'
import { AddPositionDialog } from '../../../components/AddPositionDialog'
import { EmptyState } from '../../../components/EmptyState'
import { LastUpdated } from '../../../components/LastUpdated'
import type { PositionWithPrice } from '../../../types'

interface PricesAndRates {
  prices: PriceMap
  rates: ExchangeRates
}

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
  const broker = brokers.find(b => b.id === id)

  const [dialogOpen, setDialogOpen] = useState(false)

  // Unique symbols in a stable-sorted form so the query key doesn't change
  // between renders for the same set of positions.
  const symbols = useMemo(() => [...new Set(positions.map(p => p.symbol))].sort(), [positions])

  const {
    data: pricing,
    isPending: pricesPending,
    refetch: refetchPrices,
    dataUpdatedAt,
  } = useQuery<PricesAndRates, Error>({
    queryKey: queryKeys.prices.quotes(symbols),
    queryFn: async () => {
      const [rates, prices] = await Promise.all([getExchangeRates(), fetchPrices(symbols)])
      return { rates, prices }
    },
    enabled: symbols.length > 0,
  })

  // Derive positionsWithPrices during render — no effect, no state.
  // Per-position math delegated to lib/portfolio so broker detail and
  // dashboard stay in lock-step.
  const positionsWithPrices = useMemo<PositionWithPrice[]>(() => {
    if (!pricing || positions.length === 0) return []
    return positions.map(pos => {
      const pv = computePositionValueEur(pos, pricing.prices, pricing.rates)
      const pnl = computePositionPnl(pv, displayCurrency, pricing.rates)
      return {
        id: pos.id,
        broker_id: pos.broker_id,
        user_id: pos.user_id,
        symbol: pos.symbol,
        name: pos.name,
        shares: pos.shares,
        avg_buy_price: pos.avg_buy_price,
        currency: pv.currentCurrency,
        buy_date: pos.buy_date,
        currentPrice: pv.currentPrice,
        currentValue: pnl.currentValue,
        invested: pnl.invested,
        gainLoss: pnl.gainLoss,
        gainLossPct: pnl.gainLossPct,
      }
    })
  }, [positions, pricing, displayCurrency])

  const handleDeletePosition = useCallback(
    (posId: string, symbol: string) => {
      Alert.alert(_('deletePosition'), _('deletePositionMsg', { symbol }), [
        { text: _('cancel'), style: 'cancel' },
        {
          text: _('delete'),
          style: 'destructive',
          onPress: async () => {
            const { error } = await deletePosition(posId)
            if (error) Alert.alert(_('error'), error.message)
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
      buy_date: string
    }) => {
      if (typeof id !== 'string') return { error: { message: 'Invalid broker' } }
      return addPosition({ broker_id: id, ...pos })
    },
    [addPosition, id]
  )

  const onRefresh = useCallback(async () => {
    await refetchPrices()
  }, [refetchPrices])

  const totalValue = positionsWithPrices.reduce((s, p) => s + p.currentValue, 0)
  const totalInvested = positionsWithPrices.reduce((s, p) => s + p.invested, 0)
  const totalGL = totalValue - totalInvested
  const totalGLPct = totalInvested > 0 ? (totalGL / totalInvested) * 100 : 0
  const isGain = totalGL >= 0
  const pricesLoading = pricesPending && symbols.length > 0

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
      <View className="px-5 pt-5 pb-4">
        <View className="flex-row items-center gap-3">
          <Button variant="ghost" size="sm" isIconOnly onPress={() => router.back()}>
            <ArrowLeft color={foreground} size={20} />
          </Button>
          <View className="w-3 h-3 rounded-full" style={{ backgroundColor: broker.color }} />
          <Text className="text-foreground text-3xl font-bold flex-1">{broker.name}</Text>
          <Button variant="primary" size="sm" onPress={() => setDialogOpen(true)}>
            <Plus color={accentFg} size={16} />
            <Button.Label>{_('position')}</Button.Label>
          </Button>
        </View>
        <LastUpdated timestamp={dataUpdatedAt} className="mt-1" />
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
        <EmptyState title={_('noPositions')} subtitle={_('addFirstPosition')} />
      ) : (
        <FlatList
          data={positionsWithPrices}
          keyExtractor={item => item.id}
          contentContainerClassName="px-5 pb-10"
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={pricesLoading} onRefresh={onRefresh} />}
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
