import { useCallback, useState } from 'react'
import { View, Text, ScrollView, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useThemeColor } from 'heroui-native'
import { TrendingUp, TrendingDown } from 'lucide-react-native'
import { useBrokers } from '../../hooks/useBrokers'
import { useDashboardData } from '../../hooks/useDashboardData'
import { useT } from '../../lib/t'
import { formatAmount } from '../../lib/currency'
import { CurrencyPicker } from '../../components/CurrencyPicker'
import { DashboardSkeleton } from '../../components/DashboardSkeleton'

export default function DashboardScreen() {
  const { _ } = useT()
  const [success, danger, foreground, muted] = useThemeColor([
    'success',
    'danger',
    'foreground',
    'muted',
  ])
  const { brokers } = useBrokers()
  const {
    brokerValues,
    totalValue,
    totalGainLoss,
    totalGainLossPct,
    loading,
    error,
    refetch,
    displayCurrency,
  } = useDashboardData(brokers)
  const [refreshing, setRefreshing] = useState(false)

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }, [refetch])

  const isPositive = totalGainLoss >= 0
  const fmt = useCallback((n: number) => formatAmount(n, displayCurrency), [displayCurrency])
  const brokersWithValue = brokerValues.filter(b => b.value > 0)

  if (loading && brokerValues.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <DashboardSkeleton />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        contentContainerStyle={{ padding: 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-foreground text-3xl font-bold">{_('dashboard')}</Text>
          <CurrencyPicker />
        </View>

        {/* Error */}
        {error ? (
          <View className="bg-surface rounded-2xl p-5 mb-4 items-center">
            <Text className="text-danger text-center mb-2">{error}</Text>
            <Text className="text-accent" onPress={refetch}>
              {_('tryAgain')}
            </Text>
          </View>
        ) : null}

        {/* Total value */}
        <View className="bg-surface rounded-2xl p-5 mb-4">
          <Text className="text-muted text-sm mb-1">{_('totalValue')}</Text>
          <Text className="text-foreground text-4xl font-bold">{fmt(totalValue)}</Text>
          <View className="flex-row items-center mt-2 gap-2">
            {isPositive ? (
              <TrendingUp size={16} color={success} />
            ) : (
              <TrendingDown size={16} color={danger} />
            )}
            <Text className={isPositive ? 'text-success text-sm' : 'text-danger text-sm'}>
              {isPositive ? '+' : ''}
              {fmt(totalGainLoss)} ({isPositive ? '+' : ''}
              {totalGainLossPct.toFixed(2)}%)
            </Text>
          </View>
        </View>

        {/* Allocation chart */}
        {brokersWithValue.length > 0 && (
          <View className="bg-surface rounded-2xl p-5 mb-4">
            <Text className="text-foreground font-semibold mb-4">{_('allocation')}</Text>
            <View style={{ flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden' }}>
              {brokersWithValue.map(b => (
                <View
                  key={b.brokerId}
                  style={{ flex: b.value / totalValue, backgroundColor: b.color }}
                />
              ))}
            </View>
            <View style={{ marginTop: 16, gap: 10 }}>
              {brokersWithValue.map(b => {
                const pct = totalValue > 0 ? ((b.value / totalValue) * 100).toFixed(1) : '0'
                return (
                  <View
                    key={b.brokerId}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                      <View
                        style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: b.color }}
                      />
                      <Text style={{ color: foreground, fontSize: 14 }}>{b.name}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <Text style={{ color: muted, fontSize: 13 }}>{fmt(b.value)}</Text>
                      <Text
                        style={{
                          color: foreground,
                          fontSize: 14,
                          fontWeight: '600',
                          minWidth: 48,
                          textAlign: 'right',
                        }}
                      >
                        {pct}%
                      </Text>
                    </View>
                  </View>
                )
              })}
            </View>
          </View>
        )}

        {/* Empty / Broker breakdown */}
        {brokerValues.length === 0 ? (
          <View className="bg-surface rounded-2xl p-8 items-center">
            <Text className="text-muted text-sm text-center">{_('addBrokersHint')}</Text>
          </View>
        ) : (
          <View>
            <Text className="text-foreground text-base font-semibold mb-3">
              {_('brokersSummary')}
            </Text>
            {brokerValues.map(b => (
              <View key={b.brokerId} className="bg-surface rounded-2xl p-4 mb-2">
                <View className="flex-row items-center mb-2">
                  <View
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: b.color }}
                  />
                  <Text className="text-foreground font-semibold flex-1">{b.name}</Text>
                  <Text className="text-muted text-xs">
                    {b.positionCount} {_('positions')}
                  </Text>
                </View>
                <Text className="text-foreground text-lg font-bold">{fmt(b.value)}</Text>
                <Text className={b.gainLoss >= 0 ? 'text-success text-sm' : 'text-danger text-sm'}>
                  {b.gainLoss >= 0 ? '+' : ''}
                  {fmt(b.gainLoss)} ({b.gainLoss >= 0 ? '+' : ''}
                  {b.gainLossPct.toFixed(2)}%)
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
