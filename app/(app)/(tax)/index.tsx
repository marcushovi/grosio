import { useCallback } from 'react'
import { View, Text, ScrollView, ActivityIndicator, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect } from 'expo-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Card } from 'heroui-native/card'
import { useThemeColor } from 'heroui-native'
import { ShieldCheck, ShieldAlert, Clock, CircleDollarSign } from 'lucide-react-native'
import { useT } from '../../../lib/t'
import { useSettings } from '../../../lib/settingsContext'
import { useBrokers } from '../../../hooks/useBrokers'
import { queryKeys } from '../../../lib/queryKeys'
import { fetchAllPositions } from '../../../lib/api/positions'
import { fetchPrices } from '../../../lib/api/prices'
import { getExchangeRates, formatAmount } from '../../../lib/api/currency'
import { computeTaxStatus } from '../../../lib/tax'
import type { PositionTaxStatus } from '../../../lib/tax'
import type { DisplayCurrency } from '../../../lib/currency'

interface TaxRowProps {
  item: PositionTaxStatus
  displayCurrency: DisplayCurrency
  successColor: string
  dangerColor: string
  warningColor: string
}

function TaxRow({ item, displayCurrency, successColor, dangerColor, warningColor }: TaxRowProps) {
  const { _ } = useT()
  return (
    <View className="flex-row items-center justify-between py-3 border-b border-border">
      <View className="flex-1 gap-0.5 pr-3">
        <View className="flex-row items-center gap-2">
          {item.isTaxFree ? (
            <ShieldCheck size={14} color={successColor} />
          ) : (
            <ShieldAlert size={14} color={dangerColor} />
          )}
          <Text className="text-foreground font-semibold">{item.position.symbol}</Text>
          <Text className="text-muted text-xs">× {item.position.shares}</Text>
        </View>
        <Text className="text-muted text-xs">
          {item.buyDate.toLocaleDateString()} · {item.daysHeld} {_('daysHeld')}
        </Text>
        {!item.isTaxFree && (
          <View className="flex-row items-center gap-1">
            <Clock size={11} color={warningColor} />
            <Text className="text-warning text-xs">
              {item.daysUntilTaxFree} {_('timeToTaxFree')}
            </Text>
          </View>
        )}
      </View>
      <View className="items-end gap-0.5">
        <Text className="text-foreground font-semibold text-sm">
          {formatAmount(item.currentValueDisplay, displayCurrency)}
        </Text>
        <Text
          className={
            item.isTaxFree ? 'text-success text-xs font-medium' : 'text-danger text-xs font-medium'
          }
        >
          {item.isTaxFree ? _('taxFree') : _('taxable')}
        </Text>
      </View>
    </View>
  )
}

export default function TaxScreen() {
  const { _ } = useT()
  const { domicile, currency: displayCurrency } = useSettings()
  const { brokers } = useBrokers()
  const qc = useQueryClient()
  const [success, danger, warning, accent, muted] = useThemeColor([
    'success',
    'danger',
    'warning',
    'accent',
    'muted',
  ])

  const {
    data: summary,
    isPending,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.tax.data(domicile, displayCurrency),
    queryFn: async () => {
      const [positions, rates] = await Promise.all([fetchAllPositions(), getExchangeRates()])
      const symbols = [...new Set(positions.map(p => p.symbol))]
      const priceMap = await fetchPrices(symbols)
      return computeTaxStatus(positions, brokers, domicile, displayCurrency, rates, priceMap)
    },
    enabled: brokers.length > 0,
    staleTime: 1000 * 60 * 15,
  })

  useFocusEffect(
    useCallback(() => {
      qc.invalidateQueries({ queryKey: queryKeys.tax.all })
    }, [qc])
  )

  if (isPending && !summary) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator color={accent} />
      </SafeAreaView>
    )
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center px-6 gap-3">
        <Text className="text-danger text-center">
          {error instanceof Error ? error.message : _('error')}
        </Text>
        <Text className="text-accent" onPress={() => refetch()}>
          {_('tryAgain')}
        </Text>
      </SafeAreaView>
    )
  }

  const hasPositionsWithDate = summary?.brokers.some(b => b.positions.length > 0)

  if (!summary || !hasPositionsWithDate) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center px-8 gap-3">
        <CircleDollarSign size={48} color={muted} />
        <Text className="text-foreground text-lg font-semibold text-center">
          {_('taxNoPositions')}
        </Text>
        <Text className="text-muted text-center text-sm">{_('taxNoPositionsHint')}</Text>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        contentContainerStyle={{ padding: 20 }}
        refreshControl={<RefreshControl refreshing={isPending} onRefresh={() => refetch()} />}
      >
        <Text className="text-foreground text-3xl font-bold mb-4">{_('tax')}</Text>

        {/* Rule banner */}
        <Card className="bg-surface p-4 mb-3 flex-row items-start gap-3">
          <ShieldCheck size={18} color={success} />
          <Text className="text-muted text-sm flex-1">{_(`taxFreeExplain_${domicile}`)}</Text>
        </Card>

        {/* Summary totals */}
        <View className="flex-row gap-3 mb-3">
          <Card className="flex-1 bg-surface p-4">
            <Text className="text-muted text-xs mb-1">{_('taxFreeLabel')}</Text>
            <Text className="text-success text-xl font-bold">
              {formatAmount(summary.totalTaxFreeValue, displayCurrency)}
            </Text>
          </Card>
          <Card className="flex-1 bg-surface p-4">
            <Text className="text-muted text-xs mb-1">{_('taxableLabel')}</Text>
            <Text className="text-danger text-xl font-bold">
              {formatAmount(summary.totalTaxableValue, displayCurrency)}
            </Text>
          </Card>
        </View>

        {/* Per-broker breakdown */}
        {summary.brokers.map(broker => {
          if (broker.positions.length === 0 && broker.unknownDatePositions.length === 0) return null

          return (
            <Card key={broker.brokerId} className="bg-surface p-4 mb-3">
              <View className="flex-row items-center gap-2 mb-2">
                <View
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: broker.brokerColor }}
                />
                <Text className="text-foreground font-semibold flex-1">{broker.brokerName}</Text>
                {broker.taxFreeValue > 0 && (
                  <View className="flex-row items-center gap-1">
                    <ShieldCheck size={12} color={success} />
                    <Text className="text-success text-xs font-medium">
                      {formatAmount(broker.taxFreeValue, displayCurrency)}
                    </Text>
                  </View>
                )}
              </View>

              {broker.positions.map(item => (
                <TaxRow
                  key={item.position.id}
                  item={item}
                  displayCurrency={displayCurrency}
                  successColor={success}
                  dangerColor={danger}
                  warningColor={warning}
                />
              ))}

              {broker.unknownDatePositions.map(pos => (
                <View
                  key={pos.id}
                  className="flex-row items-center justify-between py-3 border-b border-border opacity-40"
                >
                  <Text className="text-foreground">{pos.symbol}</Text>
                  <Text className="text-muted text-xs">{_('noBuyDate')}</Text>
                </View>
              ))}
            </Card>
          )
        })}
      </ScrollView>
    </SafeAreaView>
  )
}
