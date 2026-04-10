import { useCallback, useState, useRef } from 'react'
import { View, Text, ScrollView, RefreshControl, Pressable, Modal } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { TrendingUp, TrendingDown } from 'lucide-react-native'
import { useBrokers } from '../../hooks/useBrokers'
import { useDashboardData } from '../../hooks/useDashboardData'
import { useT } from '../../lib/t'
import { formatAmount, currencySymbol } from '../../lib/currency'
import { useSettings } from '../../lib/settingsContext'
import type { DisplayCurrency } from '../../lib/settingsContext'

const CURRENCIES: { value: DisplayCurrency; label: string }[] = [
  { value: 'EUR', label: '€  Euro' },
  { value: 'USD', label: '$  US Dollar' },
  { value: 'CZK', label: 'Kč  Koruna' },
]

export default function DashboardScreen() {
  const { _ } = useT()
  const { currency: displayCurrency, setCurrency, resolvedTheme } = useSettings()
  const isDark = resolvedTheme === 'dark'
  const { brokers } = useBrokers()
  const { brokerValues, totalValue, totalGainLoss, totalGainLossPct, error, refetch } =
    useDashboardData(brokers)
  const [refreshing, setRefreshing] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 })
  const btnRef = useRef<View>(null)

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }, [refetch])

  const openMenu = () => {
    btnRef.current?.measureInWindow((x, y, width, height) => {
      setMenuPos({ top: y + height + 4, right: 20 })
      setMenuOpen(true)
    })
  }

  const selectCurrency = (c: DisplayCurrency) => {
    setCurrency(c)
    setMenuOpen(false)
  }

  const isPositive = totalGainLoss >= 0
  const fmt = (n: number) => formatAmount(n, displayCurrency)

  const menuBg = isDark ? '#27272a' : '#ffffff'
  const menuText = isDark ? '#fafafa' : '#18181b'
  const menuShadowOpacity = isDark ? 0.4 : 0.15

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        contentContainerStyle={{ padding: 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-foreground text-3xl font-bold">{_('dashboard')}</Text>
          <View ref={btnRef} collapsable={false}>
            <Pressable onPress={openMenu} className="bg-surface rounded-xl px-3 py-2">
              <Text className="text-accent text-base font-semibold">
                {currencySymbol(displayCurrency)}
              </Text>
            </Pressable>
          </View>
        </View>

        <Modal
          visible={menuOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setMenuOpen(false)}
        >
          <Pressable style={{ flex: 1 }} onPress={() => setMenuOpen(false)}>
            <View
              style={{
                position: 'absolute',
                top: menuPos.top,
                right: menuPos.right,
                backgroundColor: menuBg,
                borderRadius: 12,
                paddingVertical: 4,
                minWidth: 160,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: menuShadowOpacity,
                shadowRadius: 8,
                elevation: 8,
              }}
            >
              {CURRENCIES.map(c => (
                <Pressable
                  key={c.value}
                  onPress={() => selectCurrency(c.value)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                  }}
                >
                  <Text
                    style={{
                      color: c.value === displayCurrency ? '#006fee' : menuText,
                      fontSize: 15,
                      fontWeight: c.value === displayCurrency ? '600' : '400',
                    }}
                  >
                    {c.label}
                  </Text>
                  {c.value === displayCurrency && (
                    <Text style={{ color: '#006fee', fontSize: 14 }}>✓</Text>
                  )}
                </Pressable>
              ))}
            </View>
          </Pressable>
        </Modal>

        {error ? (
          <View className="bg-surface rounded-2xl p-5 mb-4 items-center">
            <Text className="text-danger text-center mb-2">{error}</Text>
            <Text className="text-accent" onPress={refetch}>
              {_('tryAgain')}
            </Text>
          </View>
        ) : null}

        <View className="bg-surface rounded-2xl p-5 mb-4">
          <Text className="text-muted text-sm mb-1">{_('totalValue')}</Text>
          <Text className="text-foreground text-4xl font-bold">{fmt(totalValue)}</Text>
          <View className="flex-row items-center mt-2 gap-2">
            {isPositive ? (
              <TrendingUp size={16} color="#17c964" />
            ) : (
              <TrendingDown size={16} color="#f31260" />
            )}
            <Text className={isPositive ? 'text-success text-sm' : 'text-danger text-sm'}>
              {isPositive ? '+' : ''}
              {fmt(totalGainLoss)} ({isPositive ? '+' : ''}
              {totalGainLossPct.toFixed(2)}%)
            </Text>
          </View>
        </View>

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
