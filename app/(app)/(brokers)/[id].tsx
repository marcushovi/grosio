import { useCallback, useMemo, useState } from 'react'
import { View, Text, FlatList, Alert, RefreshControl } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Card } from 'heroui-native/card'
import { Button } from 'heroui-native/button'
import { useThemeColor } from 'heroui-native'
import {
  ArrowLeft,
  DollarSign,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  TrendingUp,
  TrendingDown,
} from 'lucide-react-native'
import { usePositions, useUnsellPosition } from '@/hooks/usePositions'
import { queryKeys } from '@/lib/queryKeys'
import { fetchBrokerById } from '@/lib/api/brokers'
import { fetchPrices, type PriceMap } from '@/lib/api/prices'
import { getExchangeRates } from '@/lib/api/currency'
import { useFormat } from '@/hooks/useFormat'
import type { ExchangeRates } from '@/lib/currency'
import { computePositionValueEur, computePositionPnl } from '@/lib/portfolio'
import { useSettings } from '@/lib/settingsContext'
import { useT } from '@/lib/t'
import { AddPositionDialog } from '@/components/AddPositionDialog'
import { SellPositionDialog } from '@/components/SellPositionDialog'
import { PositionRow } from '@/components/PositionRow'
import { EmptyState } from '@/components/EmptyState'
import { LastUpdated } from '@/components/LastUpdated'
import { LoadingState } from '@/components/LoadingState'
import { Screen } from '@/components/Screen'
import { SwipeableRow, type SwipeableRowAction } from '@/components/SwipeableRow'
import { isSold } from '@/types'
import type { Position, PositionWithPrice, PositionCurrency } from '@/types'

interface PricesAndRates {
  prices: PriceMap
  rates: ExchangeRates
}

export default function BrokerDetailScreen() {
  const { _ } = useT()
  const f = useFormat()
  const { currency: displayCurrency } = useSettings()
  const [success, danger, foreground, accentFg, accent] = useThemeColor([
    'success',
    'danger',
    'foreground',
    'accent-foreground',
    'accent',
  ])
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { positions, loading, addPosition, deletePosition } = usePositions(id)
  const unsellPositionMutation = useUnsellPosition()

  // Targeted single-row fetch instead of pulling the entire brokers list and
  // `.find()`-ing. The deletion cascade on the brokers list query already
  // invalidates `queryKeys.brokers.all`, which covers this key too.
  const { data: broker, isLoading: brokerLoading } = useQuery({
    queryKey: queryKeys.brokers.byId(id ?? ''),
    queryFn: () => fetchBrokerById(id as string),
    enabled: !!id,
  })

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingPosition, setEditingPosition] = useState<Position | null>(null)
  const [sellingPosition, setSellingPosition] = useState<Position | null>(null)

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
      const [rates, prices] = await Promise.all([
        queryClient.fetchQuery({
          queryKey: queryKeys.exchangeRates.latest(),
          queryFn: getExchangeRates,
          staleTime: 1000 * 60 * 60,
        }),
        fetchPrices(symbols),
      ])
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
        ...pos,
        currency: pv.currentCurrency,
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

  const handleEditPosition = useCallback(
    (posId: string) => {
      const pos = positions.find(p => p.id === posId)
      if (pos) setEditingPosition(pos)
    },
    [positions]
  )

  const handleSellPosition = useCallback(
    (posId: string) => {
      const pos = positions.find(p => p.id === posId)
      if (pos) setSellingPosition(pos)
    },
    [positions]
  )

  const handleUnsellPosition = useCallback(
    (posId: string, symbol: string) => {
      Alert.alert(_('unsellPosition'), _('unsellPositionMsg', { symbol }), [
        { text: _('cancel'), style: 'cancel' },
        {
          text: _('unsell'),
          onPress: async () => {
            try {
              await unsellPositionMutation.mutateAsync(posId)
            } catch (e) {
              Alert.alert(_('error'), e instanceof Error ? e.message : String(e))
            }
          },
        },
      ])
    },
    [_, unsellPositionMutation]
  )

  const handleAddPosition = useCallback(
    async (pos: {
      symbol: string
      name: string
      shares: number
      buy_price: number
      currency: PositionCurrency
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

  if (!id || (!broker && !brokerLoading)) {
    return (
      <Screen className="justify-center items-center">
        <Text className="text-muted">{_('brokerNotFound')}</Text>
      </Screen>
    )
  }

  if (!broker) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    )
  }

  return (
    <Screen>
      {/* Header */}
      <View className="px-5 pt-5 pb-4">
        <View className="flex-row items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            isIconOnly
            onPress={() => router.back()}
            accessibilityLabel={_('backHome')}
          >
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
            {f.formatCurrency(totalValue, displayCurrency)}
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
              {f.formatSignedCurrency(totalGL, displayCurrency)} (
              {f.formatPercent(totalGLPct, { asPercent: true })})
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
            const actions: SwipeableRowAction[] = isSold(item)
              ? [
                  {
                    label: _('unsell'),
                    icon: RotateCcw,
                    backgroundColor: accent,
                    onPress: () => handleUnsellPosition(item.id, item.symbol),
                  },
                  {
                    label: _('delete'),
                    icon: Trash2,
                    backgroundColor: danger,
                    onPress: () => handleDeletePosition(item.id, item.symbol),
                  },
                ]
              : [
                  {
                    label: _('edit'),
                    icon: Pencil,
                    backgroundColor: accent,
                    onPress: () => handleEditPosition(item.id),
                  },
                  {
                    label: _('sell'),
                    icon: DollarSign,
                    backgroundColor: success,
                    onPress: () => handleSellPosition(item.id),
                  },
                  {
                    label: _('delete'),
                    icon: Trash2,
                    backgroundColor: danger,
                    onPress: () => handleDeletePosition(item.id, item.symbol),
                  },
                ]
            return (
              <SwipeableRow actions={actions}>
                <PositionRow item={item} displayCurrency={displayCurrency} />
              </SwipeableRow>
            )
          }}
        />
      )}

      <AddPositionDialog
        isOpen={dialogOpen}
        onOpenChange={setDialogOpen}
        onAdd={handleAddPosition}
      />
      {editingPosition && (
        <AddPositionDialog
          isOpen={!!editingPosition}
          onOpenChange={open => {
            if (!open) setEditingPosition(null)
          }}
          mode="edit"
          position={editingPosition}
        />
      )}
      {sellingPosition && (
        <SellPositionDialog
          isOpen={!!sellingPosition}
          onOpenChange={open => {
            if (!open) setSellingPosition(null)
          }}
          position={sellingPosition}
        />
      )}
    </Screen>
  )
}
