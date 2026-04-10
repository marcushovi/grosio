import { useCallback } from 'react'
import { View, Text, ScrollView, ActivityIndicator, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect } from 'expo-router'
import { TrendingUp, TrendingDown, PieChart } from 'lucide-react-native'
import { PolarChart, Pie } from 'victory-native'
import { useBrokers } from '../../hooks/useBrokers'
import { useDashboardData } from '../../hooks/useDashboardData'

function fmt(n: number): string {
  return n.toLocaleString('sk-SK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function DashboardScreen() {
  const { brokers } = useBrokers()
  const { brokerValues, totalValue, totalGainLoss, totalGainLossPct, loading, error, refetch } =
    useDashboardData(brokers)

  useFocusEffect(
    useCallback(() => {
      refetch()
    }, [refetch])
  )

  const isPositive = totalGainLoss >= 0
  const pieData = brokerValues
    .filter(b => b.value > 0)
    .map(b => ({ x: b.name, y: b.value, color: b.color }))

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator />
      </SafeAreaView>
    )
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center px-6">
        <Text className="text-danger text-center">{error}</Text>
        <Text className="text-primary mt-4" onPress={refetch}>
          Skúsiť znova
        </Text>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, gap: 16 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} />}
      >
        {/* Total value card */}
        <View className="bg-content1 rounded-2xl p-4">
          <Text className="text-foreground-500 text-sm mb-1">Celková hodnota portfólia</Text>
          <Text className="text-foreground text-3xl font-bold">€{fmt(totalValue)}</Text>
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

        {/* Donut chart */}
        {pieData.length > 0 ? (
          <View className="bg-content1 rounded-2xl p-4 items-center">
            <Text className="text-foreground font-semibold mb-3">Rozloženie portfólia</Text>
            <View style={{ height: 220 }}>
              <PolarChart data={pieData} labelKey="x" valueKey="y" colorKey="color">
                <Pie.Chart innerRadius="60%">{() => <Pie.Slice />}</Pie.Chart>
              </PolarChart>
            </View>
            {/* Legend */}
            <View className="w-full mt-3 gap-2">
              {brokerValues
                .filter(b => b.value > 0)
                .map(b => (
                  <View key={b.brokerId} className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-2">
                      <View
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 5,
                          backgroundColor: b.color,
                        }}
                      />
                      <Text className="text-foreground text-sm">{b.name}</Text>
                    </View>
                    <Text className="text-foreground-500 text-sm">
                      {totalValue > 0 ? ((b.value / totalValue) * 100).toFixed(1) : '0'}%
                    </Text>
                  </View>
                ))}
            </View>
          </View>
        ) : (
          <View className="bg-content1 rounded-2xl p-8 items-center gap-3">
            <PieChart size={40} color="#6b7280" />
            <Text className="text-foreground-500 text-center">
              Pridaj brokera a pozície pre zobrazenie grafu
            </Text>
          </View>
        )}

        {/* Broker breakdown cards */}
        {brokerValues.map(b => (
          <View key={b.brokerId} className="bg-content1 rounded-2xl p-4">
            <View className="flex-row items-center gap-2 mb-2">
              <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: b.color }} />
              <Text className="text-foreground font-semibold">{b.name}</Text>
              <Text className="text-foreground-500 text-xs ml-auto">
                {b.positionCount} pozíci
                {b.positionCount === 1 ? 'a' : b.positionCount < 5 ? 'e' : 'í'}
              </Text>
            </View>
            <Text className="text-foreground text-lg font-bold">€{fmt(b.value)}</Text>
            <Text className={b.gainLoss >= 0 ? 'text-success text-sm' : 'text-danger text-sm'}>
              {b.gainLoss >= 0 ? '+' : ''}€{fmt(b.gainLoss)} ({b.gainLoss >= 0 ? '+' : ''}
              {b.gainLossPct.toFixed(2)}%)
            </Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  )
}
