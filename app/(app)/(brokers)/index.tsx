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
  const { data: dashboardBase, refetch: refetchDashboard } = useQuery<DashboardBase, Error>({
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
        <View className="px-5 pt-4 pb-2 flex-row justify-between items-center mb-4">
          <Text className="text-foreground text-3xl font-bold">{_('brokers')}</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-background justify-center items-center px-6">
        <Text className="text-danger text-center mb-4">{error}</Text>
        <Text
          className="text-destructive font-semibold mb-4"
          onPress={() => queryClient.invalidateQueries({ queryKey: queryKeys.brokers.all })}
        >
          {_('tryAgain')}
        </Text>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-5 pt-4 pb-2 flex-row justify-between items-center mb-4">
        <Text className="text-foreground text-3xl font-bold">{_('brokers')}</Text>
        <Button variant="primary" size="sm" onPress={() => setDialogOpen(true)}>
          <Plus color={accentFg} size={16} />
          <Button.Label>{_('addBroker')}</Button.Label>
        </Button>
      </View>

      {brokers.length === 0 ? (
        <View className="flex-1 justify-center items-center">
          <Text className="text-foreground text-lg mb-2">{_('noBrokersYet')}</Text>
          <Text className="text-muted text-sm">{_('addFirstBroker')}</Text>
        </View>
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
                positionCount={bv?.positionCount ?? 0}
                onPress={() => router.push(`/(app)/(brokers)/${item.id}`)}
                onLongPress={() => handleDelete(item.id, item.name)}
              />
            )
          }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} />}
        />
      )}

      <AddBrokerDialog isOpen={dialogOpen} onOpenChange={setDialogOpen} onAdd={addBroker} />
    </SafeAreaView>
  )
}
