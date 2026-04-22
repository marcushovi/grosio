import { useCallback, useMemo, useState } from 'react'
import { View, Text, FlatList, Alert, RefreshControl } from 'react-native'
import { useRouter, useFocusEffect } from 'expo-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from 'heroui-native/button'
import { useThemeColor } from 'heroui-native'
import { Pencil, Plus, Trash2 } from 'lucide-react-native'
import { useBrokers } from '@/hooks/useBrokers'
import { queryKeys } from '@/lib/queryKeys'
import { fetchAllPositions } from '@/lib/api/positions'
import { fetchPrices } from '@/lib/api/prices'
import { getExchangeRates } from '@/lib/api/currency'
import {
  computeDashboardBase,
  projectDashboardToDisplay,
  type DashboardBase,
} from '@/lib/api/dashboard'
import { useSettings } from '@/lib/settingsContext'
import { BrokerCard } from '@/components/BrokerCard'
import { AddBrokerDialog } from '@/components/AddBrokerDialog'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { LastUpdated } from '@/components/LastUpdated'
import { Screen } from '@/components/Screen'
import { SwipeableRow, type SwipeableRowAction } from '@/components/SwipeableRow'
import { useT } from '@/lib/t'
import type { Broker } from '@/types'

export default function BrokersScreen() {
  const { _ } = useT()
  const [accentFg, accent, danger] = useThemeColor([
    'accent-foreground',
    'accent',
    'danger',
  ]) as string[]
  const router = useRouter()
  const queryClient = useQueryClient()
  const { brokers, error: brokersError, deleteBroker } = useBrokers()
  const { currency: displayCurrency } = useSettings()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingBroker, setEditingBroker] = useState<Broker | null>(null)

  // Shares the same cache entry as the dashboard screen — queryKey identity
  // is what makes that work. No separate fetch when both screens are warm.
  const {
    data: dashboardBase,
    refetch: refetchDashboard,
    isFetching,
    dataUpdatedAt,
  } = useQuery<DashboardBase, Error>({
    queryKey: queryKeys.dashboard.data(),
    queryFn: async () => {
      const [positions, rates] = await Promise.all([
        fetchAllPositions(),
        queryClient.fetchQuery({
          queryKey: queryKeys.exchangeRates.latest(),
          queryFn: getExchangeRates,
          staleTime: 1000 * 60 * 60,
        }),
      ])
      const symbols = [...new Set(positions.map(p => p.symbol))]
      const priceMap = await fetchPrices(symbols)
      return computeDashboardBase(brokers, positions, priceMap, rates)
    },
    enabled: brokers.length > 0,
  })

  const { brokerValues } = useMemo(
    () => projectDashboardToDisplay(dashboardBase, displayCurrency),
    [dashboardBase, displayCurrency]
  )

  // Refresh on tab focus, honouring the queryClient's 15m staleTime:
  // `stale: true` means only queries past their staleTime actually refetch.
  useFocusEffect(
    useCallback(() => {
      queryClient.refetchQueries({ queryKey: queryKeys.brokers.all, stale: true })
      queryClient.refetchQueries({ queryKey: queryKeys.dashboard.all, stale: true })
    }, [queryClient])
  )

  const handleDelete = useCallback(
    (id: string, brokerName: string) => {
      Alert.alert(_('deleteBroker'), _('deleteBrokerMsg', { name: brokerName }), [
        { text: _('cancel'), style: 'cancel' },
        {
          text: _('delete'),
          style: 'destructive',
          onPress: async () => {
            const { error } = await deleteBroker(id)
            if (error) Alert.alert(_('error'), error.message)
          },
        },
      ])
    },
    [_, deleteBroker]
  )

  const handleEdit = useCallback(
    (id: string) => {
      const broker = brokers.find(b => b.id === id)
      if (broker) setEditingBroker(broker)
    },
    [brokers]
  )

  const onRefresh = useCallback(() => {
    refetchDashboard()
  }, [refetchDashboard])

  if (brokersError) {
    return (
      <Screen>
        <ErrorState
          message={brokersError}
          onRetry={() => queryClient.invalidateQueries({ queryKey: queryKeys.brokers.all })}
        />
      </Screen>
    )
  }

  return (
    <Screen>
      <View className="px-5 pt-5 pb-4">
        <View className="flex-row justify-between items-center">
          <Text className="text-foreground text-3xl font-bold">{_('brokers')}</Text>
          <Button variant="primary" size="sm" onPress={() => setDialogOpen(true)}>
            <Plus color={accentFg} size={16} />
            <Button.Label>{_('addBroker')}</Button.Label>
          </Button>
        </View>
        <LastUpdated timestamp={dataUpdatedAt} className="mt-1" />
      </View>

      {brokers.length === 0 ? (
        <EmptyState title={_('noBrokersYet')} subtitle={_('addFirstBroker')} />
      ) : (
        <FlatList
          data={brokers}
          keyExtractor={item => item.id}
          renderItem={({ item }) => {
            const bv = brokerValues.find(v => v.brokerId === item.id)
            const actions: SwipeableRowAction[] = [
              {
                label: _('edit'),
                icon: Pencil,
                backgroundColor: accent,
                onPress: () => handleEdit(item.id),
              },
              {
                label: _('delete'),
                icon: Trash2,
                backgroundColor: danger,
                onPress: () => handleDelete(item.id, item.name),
              },
            ]
            return (
              <SwipeableRow actions={actions}>
                <BrokerCard
                  broker={item}
                  totalValue={bv?.value ?? 0}
                  gainLoss={bv?.gainLoss ?? 0}
                  gainLossPct={bv?.gainLossPct ?? 0}
                  positionCount={bv?.positionCount ?? 0}
                  onPress={() => router.push(`/(app)/(brokers)/${item.id}`)}
                />
              </SwipeableRow>
            )
          }}
          contentContainerClassName="px-5 pb-10"
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isFetching} onRefresh={onRefresh} />}
        />
      )}

      <AddBrokerDialog isOpen={dialogOpen} onOpenChange={setDialogOpen} />
      {editingBroker && (
        <AddBrokerDialog
          isOpen={!!editingBroker}
          onOpenChange={open => {
            if (!open) setEditingBroker(null)
          }}
          mode="edit"
          broker={editingBroker}
        />
      )}
    </Screen>
  )
}
