import { useCallback, useMemo, useState } from 'react'
import { View, Text, ScrollView, RefreshControl, Pressable } from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useThemeColor } from 'heroui-native'
import { Card } from 'heroui-native/card'
import { TrendingUp, TrendingDown, ChevronRight, Wallet } from 'lucide-react-native'
import { useBrokers } from '@/hooks/useBrokers'
import { useT } from '@/lib/t'
import { useSettings } from '@/lib/settingsContext'
import { queryKeys } from '@/lib/queryKeys'
import { fetchAllPositions } from '@/lib/api/positions'
import { fetchPrices } from '@/lib/api/prices'
import { getExchangeRates, areFallbackRates } from '@/lib/api/currency'
import { useFormat } from '@/hooks/useFormat'
import {
  computeDashboardBase,
  projectDashboardToDisplay,
  type DashboardBase,
} from '@/lib/api/dashboard'
import { CurrencyPicker } from '@/components/CurrencyPicker'
import { LastUpdated } from '@/components/LastUpdated'
import { Screen } from '@/components/Screen'
import { ErrorState } from '@/components/ErrorState'
import { EmptyState } from '@/components/EmptyState'
import { useTaxSummary } from '@/hooks/useTaxSummary'
import { projectTaxSummaryToDisplay } from '@/lib/tax'

export default function DashboardScreen() {
  const { _ } = useT()
  const f = useFormat()
  const [success, danger, muted] = useThemeColor(['success', 'danger', 'muted'])
  const queryClient = useQueryClient()
  const router = useRouter()
  const { brokers, error: brokersError } = useBrokers()
  const { currency: displayCurrency } = useSettings()

  // EUR base. Display projection runs in a memo — switching currency does
  // not refetch.
  const {
    data: dashboardBase,
    isPending: dashboardLoading,
    error,
    refetch: refetchDashboard,
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

  const { brokerValues, movers, totalValue, totalGainLoss, totalGainLossPct } = useMemo(
    () => projectDashboardToDisplay(dashboardBase, displayCurrency),
    [dashboardBase, displayCurrency]
  )

  // Tax summary — overview under the total. Same queryKey as the tax screen.
  const { data: taxSummaryBase } = useTaxSummary()
  const taxSummary = useMemo(
    () => projectTaxSummaryToDisplay(taxSummaryBase, displayCurrency),
    [taxSummaryBase, displayCurrency]
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
  const fmt = useCallback((n: number) => f.formatCurrency(n, displayCurrency), [f, displayCurrency])
  const brokersWithValue = brokerValues.filter(b => b.value > 0)

  if (brokersError) {
    return (
      <Screen>
        <ErrorState
          message={brokersError}
          onRetry={() => queryClient.invalidateQueries({ queryKey: queryKeys.brokers.all })}
          retryLabel={_('tryAgain')}
        />
      </Screen>
    )
  }

  // Zero-broker path: dashboard query is disabled so nothing loads on its
  // own. Show a focused CTA instead of empty cards.
  if (brokers.length === 0) {
    return (
      <Screen>
        <View className="px-5 pt-5 pb-4 flex-row items-center justify-between">
          <Text className="text-foreground text-3xl font-bold">{_('dashboard')}</Text>
          <CurrencyPicker />
        </View>
        <EmptyState
          icon={Wallet}
          title={_('noBrokersYet')}
          subtitle={_('addBrokersHint')}
          actionLabel={_('createBroker')}
          onAction={() => router.push('/(app)/(brokers)')}
        />
      </Screen>
    )
  }

  return (
    <Screen>
      <ScrollView
        contentContainerClassName="p-5"
        refreshControl={
          <RefreshControl refreshing={refreshing || dashboardLoading} onRefresh={onRefresh} />
        }
      >
        <View className="mb-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-foreground text-3xl font-bold">{_('dashboard')}</Text>
            <CurrencyPicker />
          </View>
          <LastUpdated timestamp={dataUpdatedAt} />
        </View>

        {error
          ? (() => {
              console.warn('[dashboard] query error:', error.message)
              return (
                <Card className="bg-surface mb-4">
                  <Card.Body className="items-center">
                    <Text className="text-danger text-center mb-2">{_('error')}</Text>
                    <Text className="text-accent" onPress={() => refetchDashboard()}>
                      {_('tryAgain')}
                    </Text>
                  </Card.Body>
                </Card>
              )
            })()
          : null}

        {dashboardBase && areFallbackRates(dashboardBase.rates) && (
          <View className="bg-surface rounded-xl px-3 py-2 mb-3 flex-row items-center gap-2">
            <Text className="text-warning text-xs">{_('ratesFallback')}</Text>
          </View>
        )}

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
                {f.formatSignedCurrency(totalGainLoss, displayCurrency)} (
                {f.formatPercent(totalGainLossPct, { asPercent: true })})
              </Text>
            </View>
          </Card.Body>
        </Card>

        {/* Movers — top 3 gainers / losers by pnlPercent. */}
        {(movers.topGainers.length > 0 || movers.topLosers.length > 0) && (
          <View className="bg-surface rounded-2xl p-4 gap-3 mb-4">
            <Text className="text-foreground font-semibold">{_('moversTitle')}</Text>
            <View className="flex-row">
              <View className="flex-1 pr-3">
                <Text className="text-muted text-xs mb-2">{_('topGainers')}</Text>
                {movers.topGainers.map((m, i) => (
                  <View
                    key={`gainer-${m.symbol}-${i}`}
                    className="flex-row justify-between items-center py-1"
                  >
                    <Text className="text-foreground text-sm font-semibold">{m.symbol}</Text>
                    <Text className="text-success text-sm font-semibold">
                      {f.formatPercent(m.pnlPercent, {
                        asPercent: true,
                        minimumFractionDigits: 1,
                        maximumFractionDigits: 1,
                      })}
                    </Text>
                  </View>
                ))}
              </View>
              <View className="w-px my-1 bg-border" />
              <View className="flex-1 pl-3">
                <Text className="text-muted text-xs mb-2">{_('topLosers')}</Text>
                {movers.topLosers.map((m, i) => (
                  <View
                    key={`loser-${m.symbol}-${i}`}
                    className="flex-row justify-between items-center py-1"
                  >
                    <Text className="text-foreground text-sm font-semibold">{m.symbol}</Text>
                    <Text className="text-danger text-sm font-semibold">
                      {f.formatPercent(m.pnlPercent, {
                        asPercent: true,
                        minimumFractionDigits: 1,
                        maximumFractionDigits: 1,
                      })}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {taxSummary && (
          <Pressable
            className="bg-surface rounded-2xl p-4 gap-3 mb-4"
            onPress={() => router.push('/(app)/(tax)')}
          >
            <View className="flex-row items-center justify-between">
              <Text className="text-foreground font-semibold">{_('taxOverview')}</Text>
              <ChevronRight size={16} color={muted} />
            </View>
            <View className="flex-row">
              <View className="flex-1 pr-3 gap-1">
                <Text className="text-muted text-xs">{_('taxFreeLabel')}</Text>
                <Text className="text-success text-lg font-bold">
                  {fmt(taxSummary.totalTaxFreeValue)}
                </Text>
              </View>
              <View className="w-px my-1 bg-border" />
              <View className="flex-1 pl-3 gap-1">
                <Text className="text-muted text-xs">{_('taxableLabel')}</Text>
                <Text className="text-danger text-lg font-bold">
                  {fmt(taxSummary.totalTaxableValue)}
                </Text>
              </View>
            </View>
          </Pressable>
        )}

        {brokersWithValue.length > 0 && (
          <Card className="bg-surface mb-4">
            <Card.Body>
              <Text className="text-foreground font-semibold mb-4">{_('allocation')}</Text>
              <View className="flex-row h-3 rounded-lg overflow-hidden">
                {brokersWithValue.map(b => (
                  <View
                    key={b.brokerId}
                    style={{
                      flexGrow: b.value / totalValue,
                      flexBasis: 0,
                      backgroundColor: b.color,
                    }}
                  />
                ))}
              </View>
              <View className="mt-4 gap-2.5">
                {brokersWithValue.map(b => {
                  const ratio = totalValue > 0 ? b.value / totalValue : 0
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
                          {f.formatPercent(ratio, {
                            signed: false,
                            minimumFractionDigits: 1,
                            maximumFractionDigits: 1,
                          })}
                        </Text>
                      </View>
                    </View>
                  )
                })}
              </View>
            </Card.Body>
          </Card>
        )}

        {brokerValues.length === 0 && (
          <Card className="bg-surface">
            <Card.Body className="items-center py-4">
              <Text className="text-muted text-sm text-center">{_('addBrokersHint')}</Text>
            </Card.Body>
          </Card>
        )}
      </ScrollView>
    </Screen>
  )
}
