import { useCallback, useMemo, useState } from 'react'
import { View, Text, FlatList, Alert, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useFocusEffect } from 'expo-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from 'heroui-native/button'
import { useThemeColor } from 'heroui-native'
import { Plus } from 'lucide-react-native'
import { useBrokers } from '../../../hooks/useBrokers'
import { queryKeys } from '../../../lib/queryKeys'
import { fetchAllPositions } from '../../../lib/api/positions'
import { fetchPrices } from '../../../lib/api/prices'
import { getExchangeRates } from '../../../lib/api/currency'
import {
  computeDashboardBase,
  projectDashboardToDisplay,
  type DashboardBase,
} from '../../../lib/api/dashboard'
import { useSettings } from '../../../lib/settingsContext'
import { BrokerCard } from '../../../components/BrokerCard'
import { AddBrokerDialog } from '../../../components/AddBrokerDialog'
import { EmptyState } from '../../../components/EmptyState'
import { ErrorState } from '../../../components/ErrorState'
import { LastUpdated } from '../../../components/LastUpdated'
import { useT } from '../../../lib/t'

export default function BrokersScreen() {
  const { _ } = useT()
  const accentFg = useThemeColor('accent-foreground') as string
  const router = useRouter()
  const queryClient = useQueryClient()
  const { brokers, loading, error, addBroker, deleteBroker } = useBrokers()
  const { currency: displayCurrency } = useSettings()
  const [dialogOpen, setDialogOpen] = useState(false)

  // Shares the same cache entry as the dashboard screen — queryKey identity
  // is what makes that work. No separate fetch when both screens are warm.
  const {
    data: dashboardBase,
    refetch: refetchDashboard,
    dataUpdatedAt,
  } = useQuery<DashboardBase, Error>({
    queryKey: queryKeys.dashboard.data(),
    queryFn: async () => {
      const [positions, rates] = await Promise.all([fetchAllPositions(), getExchangeRates()])
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

  // Refresh data when the tab regains focus so new data from the detail
  // screen (add/delete position) shows up here.
  useFocusEffect(
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: queryKeys.brokers.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all })
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

  const onRefresh = useCallback(() => {
    refetchDashboard()
  }, [refetchDashboard])

  if (loading && brokers.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="px-5 pt-5 pb-4 flex-row justify-between items-center">
          <Text className="text-foreground text-3xl font-bold">{_('brokers')}</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <ErrorState
          message={error}
          onRetry={() => queryClient.invalidateQueries({ queryKey: queryKeys.brokers.all })}
        />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
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
            return (
              <BrokerCard
                broker={item}
                totalValue={bv?.value ?? 0}
                gainLoss={bv?.gainLoss ?? 0}
                gainLossPct={bv?.gainLossPct ?? 0}
                positionCount={bv?.positionCount ?? 0}
                onPress={() => router.push(`/(app)/(brokers)/${item.id}`)}
                onLongPress={() => handleDelete(item.id, item.name)}
              />
            )
          }}
          contentContainerClassName="px-5 pb-10"
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} />}
        />
      )}

      <AddBrokerDialog isOpen={dialogOpen} onOpenChange={setDialogOpen} onAdd={addBroker} />
    </SafeAreaView>
  )
}
