import { useCallback, useMemo, useState } from 'react'
import { View, Text, ScrollView, RefreshControl, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useThemeColor } from 'heroui-native'
import { Card } from 'heroui-native/card'
import { CartesianChart, Line } from 'victory-native'
import { TrendingUp, TrendingDown } from 'lucide-react-native'
import { useBrokers } from '../../../hooks/useBrokers'
import { useDashboardData } from '../../../hooks/useDashboardData'
import { usePortfolioHistory } from '../../../hooks/usePortfolioHistory'
import { useT } from '../../../lib/t'
import { formatAmount, formatGainLoss } from '../../../lib/currency'
import { CurrencyPicker } from '../../../components/CurrencyPicker'

export default function DashboardScreen() {
  const { _ } = useT()
  const [success, danger, accent] = useThemeColor(['success', 'danger', 'accent'])
  const { brokers } = useBrokers()
  const { data: historyData, loading: historyLoading } = usePortfolioHistory()
  const {
    brokerValues,
    totalValue,
    totalGainLoss,
    totalGainLossPct,
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
  const chartData = useMemo(
    () => historyData.map((p, i) => ({ x: i, value: p.value })),
    [historyData]
  )

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        contentContainerStyle={{ padding: 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-foreground text-3xl font-bold">{_('dashboard')}</Text>
          <CurrencyPicker />
        </View>

        {error ? (
          <Card className="bg-surface mb-4">
            <Card.Body className="items-center">
              <Text className="text-danger text-center mb-2">{error}</Text>
              <Text className="text-accent" onPress={refetch}>
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

        {/* Portfolio history chart */}
        {chartData.length > 1 && (
          <Card className="bg-surface mb-4">
            <Card.Body>
              <Text className="text-foreground font-semibold mb-1">{_('portfolioHistory')}</Text>
              <Text className="text-muted text-xs mb-3">{_('portfolioHistorySubtitle')}</Text>
              <View style={{ height: 180 }}>
                {historyLoading ? (
                  <View className="flex-1 justify-center items-center">
                    <ActivityIndicator color={accent} />
                  </View>
                ) : (
                  <CartesianChart data={chartData} xKey="x" yKeys={['value']}>
                    {({ points }) => (
                      <Line
                        points={points.value}
                        color={accent}
                        strokeWidth={2}
                        curveType="natural"
                      />
                    )}
                  </CartesianChart>
                )}
              </View>
              <View className="flex-row justify-between mt-1">
                <Text className="text-muted text-xs">{historyData[0]?.date}</Text>
                <Text className="text-muted text-xs">
                  {historyData[historyData.length - 1]?.date}
                </Text>
              </View>
            </Card.Body>
          </Card>
        )}

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
