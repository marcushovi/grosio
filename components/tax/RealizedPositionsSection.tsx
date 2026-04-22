import { useMemo } from 'react'
import { View, Text, ActivityIndicator } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { Card } from 'heroui-native/card'
import { Select } from 'heroui-native/select'
import { Inbox } from 'lucide-react-native'
import { useT } from '../../lib/t'
import { useFormat } from '../../hooks/useFormat'
import { useSettings } from '../../lib/settingsContext'
import { useRealizedPositions } from '../../hooks/useRealizedPositions'
import { queryKeys } from '../../lib/queryKeys'
import { getExchangeRates } from '../../lib/api/currency'
import { aggregateRealizedTax } from '../../lib/tax'
import type { ExchangeRates } from '../../lib/currency'
import { EmptyState } from '../EmptyState'
import { ErrorState } from '../ErrorState'
import { RealizedPositionCard } from './RealizedPositionCard'

interface RealizedPositionsSectionProps {
  year: number
  onYearChange: (year: number) => void
}

const YEARS_BACK = 5

export function RealizedPositionsSection({ year, onYearChange }: RealizedPositionsSectionProps) {
  const { _ } = useT()
  const f = useFormat()
  const { domicile, currency: displayCurrency } = useSettings()

  const currentYear = new Date().getFullYear()
  const years = useMemo(
    () => Array.from({ length: YEARS_BACK + 1 }, (_, i) => currentYear - i),
    [currentYear]
  )

  const { data: positions, isPending, error, refetch } = useRealizedPositions(year)

  // FX rates shared with the open section via the same queryKey — cached for
  // an hour, so switching years doesn't trigger a Frankfurter fetch.
  const { data: rates } = useQuery<ExchangeRates, Error>({
    queryKey: queryKeys.exchangeRates.latest(),
    queryFn: getExchangeRates,
    staleTime: 1000 * 60 * 60,
  })

  // Totals re-compute when positions, domicile, rates, or displayCurrency
  // change — `domicile` covers the SK/CZ time-test switch, `displayCurrency`
  // covers EUR/USD/CZK switch.
  const totals = useMemo(() => {
    if (!positions || !rates) return { taxFreeTotal: 0, taxableTotal: 0 }
    return aggregateRealizedTax(positions, domicile, rates, displayCurrency)
  }, [positions, rates, domicile, displayCurrency])

  return (
    <View className="mt-2">
      {/* Section header with year picker. The Select trigger needs an
          explicit width — `Select.Value` has `flex-1` in HeroUI's base
          styles, and without a bounded parent the trigger collapses to
          the minimum and wraps "2026" onto two lines. */}
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-foreground text-lg font-semibold flex-1">{_('realizedInYear')}</Text>
        <View style={{ width: 110 }}>
          <Select
            value={{ value: String(year), label: String(year) }}
            onValueChange={opt => {
              if (opt && !Array.isArray(opt)) onYearChange(Number(opt.value))
            }}
          >
            <Select.Trigger>
              <Select.Value placeholder="" numberOfLines={1} />
              <Select.TriggerIndicator />
            </Select.Trigger>
            <Select.Portal>
              <Select.Overlay />
              <Select.Content presentation="popover" placement="bottom" align="end" width="trigger">
                {years.map(y => (
                  <Select.Item key={y} value={String(y)} label={String(y)}>
                    <Select.ItemLabel />
                    <Select.ItemIndicator />
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Portal>
          </Select>
        </View>
      </View>

      {error ? (
        <ErrorState
          message={error instanceof Error ? error.message : _('error')}
          onRetry={() => refetch()}
        />
      ) : isPending || !rates ? (
        <View className="py-8 items-center">
          <ActivityIndicator />
        </View>
      ) : !positions || positions.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={_('noRealizedInYear', { year })}
          subtitle={_('tryAnotherYear')}
        />
      ) : (
        <>
          {/* Summary totals */}
          <View className="flex-row gap-3 mb-3">
            <Card className="flex-1 bg-surface p-4">
              <Text className="text-muted text-xs mb-1">{_('taxFreeProfit')}</Text>
              <Text className="text-success text-xl font-bold">
                {f.formatSignedCurrency(totals.taxFreeTotal, displayCurrency)}
              </Text>
            </Card>
            <Card className="flex-1 bg-surface p-4">
              <Text className="text-muted text-xs mb-1">{_('taxableProfit')}</Text>
              <Text className="text-warning text-xl font-bold">
                {f.formatSignedCurrency(totals.taxableTotal, displayCurrency)}
              </Text>
            </Card>
          </View>

          {/* List */}
          {positions.map(pos => (
            <RealizedPositionCard
              key={pos.id}
              position={pos}
              domicile={domicile}
              rates={rates}
              displayCurrency={displayCurrency}
            />
          ))}
        </>
      )}
    </View>
  )
}
