import { useCallback, useMemo, useState } from 'react'
import { View, Text, ScrollView, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useThemeColor } from 'heroui-native'
import { Card } from 'heroui-native/card'
import { TrendingUp, TrendingDown } from 'lucide-react-native'
import { useBrokers } from '../../../hooks/useBrokers'
import { useT } from '../../../lib/t'
import { useSettings } from '../../../lib/settingsContext'
import { queryKeys } from '../../../lib/queryKeys'
import { fetchAllPositions } from '../../../lib/api/positions'
import { fetchPrices } from '../../../lib/api/prices'
import { getExchangeRates, formatAmount, formatGainLoss } from '../../../lib/api/currency'
import {
  computeDashboardBase,
  projectDashboardToDisplay,
  type DashboardBase,
} from '../../../lib/api/dashboard'
import { CurrencyPicker } from '../../../components/CurrencyPicker'

export default function DashboardScreen() {
  const { _ } = useT()
  const [success, danger] = useThemeColor(['success', 'danger'])
  const queryClient = useQueryClient()
  const { brokers } = useBrokers()
  const { currency: displayCurrency } = useSettings()

  // EUR-base dashboard aggregate. Currency-invariant so switching display
  // currency doesn't trigger a refetch — the projection happens in the
  // useMemo below.
  const {
    data: dashboardBase,
    isPending: dashboardLoading,
    error,
    refetch: refetchDashboard,
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

  // Display-currency projection — pure, runs every render (cheap math).
  const { brokerValues, totalValue, totalGainLoss, totalGainLossPct } = useMemo(
    () => projectDashboardToDisplay(dashboardBase, displayCurrency),
    [dashboardBase, displayCurrency]
  )

  const [refreshing, setRefreshing] = useState(false)
  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.brokers.all }),
      ])
      await refetchDashboard()
    } finally {
      setRefreshing(false)
    }
  }, [queryClient, refetchDashboard])

  const isPositive = totalGainLoss >= 0
  const fmt = useCallback((n: number) => formatAmount(n, displayCurrency), [displayCurrency])
  const brokersWithValue = brokerValues.filter(b => b.value > 0)

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        contentContainerStyle={{ padding: 20 }}
        refreshControl={
          <RefreshControl refreshing={refreshing || dashboardLoading} onRefresh={onRefresh} />
        }
      >
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-foreground text-3xl font-bold">{_('dashboard')}</Text>
          <CurrencyPicker />
        </View>

        {error ? (
          <Card className="bg-surface mb-4">
            <Card.Body className="items-center">
              <Text className="text-danger text-center mb-2">{error.message}</Text>
              <Text className="text-accent" onPress={() => refetchDashboard()}>
                {_('tryAgain')}
              </Text>
            </Card.Body>
          </Card>
        ) : null}

        {/* Total value */}
        <Card className="bg-surface mb-4">
          <Card.Body>
            <Text className="text-muted text-sm mb-1">{_('totalValue')}</Text>
            <Text className="text-foreground text-4xl font-bold">{fmt(totalValue)}</Text>
            <View className="flex-row items-center mt-2 gap-2">
              {isPositive ? (
                <TrendingUp size={16} color={success} />
              ) : (
                <TrendingDown size={16} color={danger} />
              )}
              <Text className={isPositive ? 'text-success text-sm' : 'text-danger text-sm'}>
                {formatGainLoss(totalGainLoss, totalGainLossPct, displayCurrency)}
              </Text>
            </View>
          </Card.Body>
        </Card>

        {/* Allocation */}
        {brokersWithValue.length > 0 && (
          <Card className="bg-surface mb-4">
            <Card.Body>
              <Text className="text-foreground font-semibold mb-4">{_('allocation')}</Text>
              <View className="flex-row h-3 rounded-lg overflow-hidden">
                {brokersWithValue.map(b => (
                  <View
                    key={b.brokerId}
                    style={{ flex: b.value / totalValue, backgroundColor: b.color }}
                  />
                ))}
              </View>
              <View className="mt-4 gap-2.5">
                {brokersWithValue.map(b => {
                  const pct = totalValue > 0 ? ((b.value / totalValue) * 100).toFixed(1) : '0'
                  return (
                    <View key={b.brokerId} className="flex-row items-center justify-between">
                      <View className="flex-row items-center gap-2 flex-1">
                        <View
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: b.color }}
                        />
                        <Text className="text-foreground text-sm">{b.name}</Text>
                      </View>
                      <View className="flex-row items-center gap-3">
                        <Text className="text-muted text-xs">{fmt(b.value)}</Text>
                        <Text className="text-foreground text-sm font-semibold min-w-12 text-right">
                          {pct}%
                        </Text>
                      </View>
                    </View>
                  )
                })}
              </View>
            </Card.Body>
          </Card>
        )}

        {/* Empty state when there are no brokers yet */}
        {brokerValues.length === 0 && (
          <Card className="bg-surface">
            <Card.Body className="items-center py-4">
              <Text className="text-muted text-sm text-center">{_('addBrokersHint')}</Text>
            </Card.Body>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
