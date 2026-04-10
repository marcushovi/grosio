import { useCallback, useState } from 'react'
import { View, Text, ScrollView, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { TrendingUp, TrendingDown } from 'lucide-react-native'
import { useBrokers } from '../../hooks/useBrokers'
import { useDashboardData } from '../../hooks/useDashboardData'

function fmt(n: number): string {
  return n.toFixed(2)
}

export default function DashboardScreen() {
  const { brokers } = useBrokers()
  const { brokerValues, totalValue, totalGainLoss, totalGainLossPct, error, refetch } =
    useDashboardData(brokers)
  const [refreshing, setRefreshing] = useState(false)

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }, [refetch])

  const isPositive = totalGainLoss >= 0

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        contentContainerStyle={{ padding: 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View className="pb-2 mb-2">
          <Text className="text-foreground text-3xl font-bold">Prehľad</Text>
        </View>

        {error ? (
          <View className="bg-surface rounded-2xl p-5 mb-4 items-center">
            <Text className="text-danger text-center mb-2">{error}</Text>
            <Text className="text-accent" onPress={refetch}>
              Skúsiť znova
            </Text>
          </View>
        ) : null}

        <View className="bg-surface rounded-2xl p-5 mb-4">
          <Text className="text-muted text-sm mb-1">Celková hodnota portfólia</Text>
          <Text className="text-foreground text-4xl font-bold">€{fmt(totalValue)}</Text>
          <View className="flex-row items-center mt-2 gap-2">
            {isPositive ? (
              <TrendingUp size={16} color="#17c964" />
            ) : (
              <TrendingDown size={16} color="#f31260" />
            )}
            <Text className={isPositive ? 'text-success text-sm' : 'text-danger text-sm'}>
              {isPositive ? '+' : ''}€{fmt(totalGainLoss)} ({isPositive ? '+' : ''}
              {totalGainLossPct.toFixed(2)}%)
            </Text>
          </View>
        </View>

        {brokerValues.length === 0 ? (
          <View className="bg-surface rounded-2xl p-8 items-center">
            <Text className="text-muted text-sm text-center">
              Pridaj brokera a pozície pre zobrazenie portfólia
            </Text>
          </View>
        ) : (
          <View>
            <Text className="text-foreground text-base font-semibold mb-3">Prehľad brokerov</Text>
            {brokerValues.map(b => (
              <View key={b.brokerId} className="bg-surface rounded-2xl p-4 mb-2">
                <View className="flex-row items-center mb-2">
                  <View
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: b.color }}
                  />
                  <Text className="text-foreground font-semibold flex-1">{b.name}</Text>
                  <Text className="text-muted text-xs">
                    {b.positionCount} pozíci
                    {b.positionCount === 1 ? 'a' : b.positionCount < 5 ? 'e' : 'í'}
                  </Text>
                </View>
                <Text className="text-foreground text-lg font-bold">€{fmt(b.value)}</Text>
                <Text
                  className={b.gainLoss >= 0 ? 'text-success text-sm' : 'text-danger text-sm'}
                >
                  {b.gainLoss >= 0 ? '+' : ''}€{fmt(b.gainLoss)} ({b.gainLoss >= 0 ? '+' : ''}
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
