import { memo, useCallback, useMemo, useState } from 'react'
import { View, Text, ScrollView, RefreshControl, Pressable } from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import { useQueryClient } from '@tanstack/react-query'
import { Card } from 'heroui-native/card'
import { useThemeColor } from 'heroui-native'
import {
  ShieldCheck,
  Clock,
  CircleDollarSign,
  ChevronDown,
  ChevronRight,
  Wallet,
} from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import { useSettings } from '@/lib/settingsContext'
import { queryKeys } from '@/lib/queryKeys'
import { useFormat } from '@/hooks/useFormat'
import { projectTaxSummaryToDisplay, type PositionTaxStatus } from '@/lib/tax'
import type { DisplayCurrency } from '@/lib/currency'
import { useTaxSummary } from '@/hooks/useTaxSummary'
import { useBrokers } from '@/hooks/useBrokers'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { LoadingState } from '@/components/LoadingState'
import { CurrencyPicker } from '@/components/CurrencyPicker'
import { LastUpdated } from '@/components/LastUpdated'
import { Screen } from '@/components/Screen'
import { RealizedPositionsSection } from '@/components/tax/RealizedPositionsSection'

interface TaxRowProps {
  item: PositionTaxStatus
  displayCurrency: DisplayCurrency
  warningColor: string
}

const TaxRow = memo(function TaxRow({ item, displayCurrency, warningColor }: TaxRowProps) {
  const { t: _ } = useTranslation()
  const f = useFormat()
  return (
    <View className="flex-row items-center justify-between py-3 border-b border-border">
      <View className="flex-1 gap-0.5 pr-3">
        <View className="flex-row items-center gap-2">
          <Text className="text-foreground font-semibold">{item.position.symbol}</Text>
          <Text className="text-muted text-xs">× {item.position.shares}</Text>
        </View>
        <Text className="text-muted text-xs">
          {f.formatDate(item.buyDate)} · {item.daysHeld} {_('daysHeld')}
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
          {f.formatCurrency(item.currentValueDisplay, displayCurrency)}
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
})

export default function TaxScreen() {
  const { t: _ } = useTranslation()
  const f = useFormat()
  const router = useRouter()
  const { domicile, currency: displayCurrency } = useSettings()
  const queryClient = useQueryClient()
  const { brokers } = useBrokers()
  const [success, warning, foreground] = useThemeColor(['success', 'warning', 'foreground'])

  // Broker sections collapse by default to keep the scroll short.
  const [expandedBrokers, setExpandedBrokers] = useState<Set<string>>(new Set())
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear())
  const toggleBroker = useCallback((brokerId: string) => {
    setExpandedBrokers(prev => {
      const next = new Set(prev)
      if (next.has(brokerId)) next.delete(brokerId)
      else next.add(brokerId)
      return next
    })
  }, [])

  const {
    data: summaryBase,
    isPending,
    isFetching,
    error,
    refetch,
    dataUpdatedAt,
  } = useTaxSummary()

  const summary = useMemo(
    () => projectTaxSummaryToDisplay(summaryBase, displayCurrency),
    [summaryBase, displayCurrency]
  )

  useFocusEffect(
    useCallback(() => {
      const STALE_MS = 1000 * 60 * 15
      const state = queryClient.getQueryState(queryKeys.tax.data(domicile))
      if (!state?.dataUpdatedAt || Date.now() - state.dataUpdatedAt > STALE_MS) {
        queryClient.invalidateQueries({ queryKey: queryKeys.tax.all })
      }
    }, [queryClient, domicile])
  )

  // No brokers → useTaxSummary stays disabled and isPending never resolves.
  // Show the onboarding CTA instead of a permanent spinner.
  if (brokers.length === 0) {
    return (
      <Screen>
        <View className="px-5 pt-5 pb-4 flex-row items-center justify-between">
          <Text className="text-foreground text-3xl font-bold">{_('tax')}</Text>
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

  if (isPending && !summary) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    )
  }

  if (error) {
    return (
      <Screen>
        <ErrorState
          message={error instanceof Error ? error.message : _('error')}
          onRetry={refetch}
        />
      </Screen>
    )
  }

  const hasPositionsWithDate = summary?.brokers.some(b => b.positions.length > 0)

  if (!summary || !hasPositionsWithDate) {
    return (
      <Screen>
        <EmptyState
          icon={CircleDollarSign}
          title={_('taxNoPositions')}
          subtitle={_('taxNoPositionsHint')}
        />
      </Screen>
    )
  }

  return (
    <Screen>
      <ScrollView
        contentContainerClassName="p-5"
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={() => refetch()} />}
      >
        <View className="mb-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-foreground text-3xl font-bold">{_('tax')}</Text>
            <CurrencyPicker />
          </View>
          <LastUpdated timestamp={dataUpdatedAt} />
        </View>

        <Card className="bg-surface p-4 mb-3 flex-row items-start gap-3">
          <ShieldCheck size={18} color={success} />
          <Text className="text-muted text-sm flex-1">{_(`taxFreeExplain_${domicile}`)}</Text>
        </Card>

        <View className="flex-row gap-3 mb-3">
          <Card className="flex-1 bg-surface p-4">
            <Text className="text-muted text-xs mb-1">{_('taxFreeLabel')}</Text>
            <Text className="text-success text-xl font-bold">
              {f.formatCurrency(summary.totalTaxFreeValue, displayCurrency)}
            </Text>
          </Card>
          <Card className="flex-1 bg-surface p-4">
            <Text className="text-muted text-xs mb-1">{_('taxableLabel')}</Text>
            <Text className="text-danger text-xl font-bold">
              {f.formatCurrency(summary.totalTaxableValue, displayCurrency)}
            </Text>
          </Card>
        </View>

        <Text className="text-foreground text-lg font-semibold mb-3">{_('openPositions')}</Text>

        {summary.brokers.map(broker => {
          if (broker.positions.length === 0 && broker.unknownDatePositions.length === 0) return null

          const isExpanded = expandedBrokers.has(broker.brokerId)

          return (
            <Card key={broker.brokerId} className="bg-surface p-4 mb-3">
              <Pressable
                onPress={() => toggleBroker(broker.brokerId)}
                className="flex-row items-center gap-2"
              >
                {isExpanded ? (
                  <ChevronDown size={16} color={foreground} />
                ) : (
                  <ChevronRight size={16} color={foreground} />
                )}
                <View
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: broker.brokerColor }}
                />
                <Text className="text-foreground font-semibold flex-1">{broker.brokerName}</Text>
                {broker.taxFreeValue > 0 && (
                  <Text className="text-success text-xs font-medium">
                    {f.formatCurrency(broker.taxFreeValue, displayCurrency)}
                  </Text>
                )}
              </Pressable>

              {isExpanded && (
                <View className="mt-2">
                  {broker.positions.map(item => (
                    <TaxRow
                      key={item.position.id}
                      item={item}
                      displayCurrency={displayCurrency}
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
                </View>
              )}
            </Card>
          )
        })}

        <RealizedPositionsSection year={selectedYear} onYearChange={setSelectedYear} />

        <Text className="text-muted text-xs mt-4">{_('taxDisclaimer')}</Text>
      </ScrollView>
    </Screen>
  )
}
