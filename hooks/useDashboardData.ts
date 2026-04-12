import { useMemo } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { usePrices } from './usePrices'
import { getExchangeRates, toEur, convertToDisplay } from '../lib/currency'
import { useSettings } from '../lib/settingsContext'
import type { Broker, Position, BrokerValue } from '../types'
import type { ExchangeRates, DisplayCurrency } from '../lib/currency'

interface BrokerValueEur {
  brokerId: string
  name: string
  color: string
  valueEur: number
  investedEur: number
  positionCount: number
}

export interface DashboardData {
  brokerValues: BrokerValue[]
  totalValue: number
  totalInvested: number
  totalGainLoss: number
  totalGainLossPct: number
  loading: boolean
  error: string | null
  refetch: () => void
  rates: ExchangeRates | null
  displayCurrency: DisplayCurrency
}

export function useDashboardData(brokers: Broker[]): DashboardData {
  const { currency: displayCurrency } = useSettings()
  const { fetchPrices } = usePrices()

  const {
    data: fetchedData,
    isPending: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['dashboardData', brokers.map(b => b.id).join(',')],
    queryFn: async () => {
      if (brokers.length === 0) {
        return { values: [], rates: null }
      }

      const { data: allPositions, error: posErr } = await supabase.from('positions').select('*')
      if (posErr) throw posErr

      const positions: Position[] = allPositions ?? []
      const exchangeRates = await getExchangeRates()

      const allSymbols = [...new Set(positions.map(p => p.symbol))]
      const priceMap = await fetchPrices(allSymbols)

      const positionsByBroker = new Map<string, Position[]>()
      for (const broker of brokers) {
        positionsByBroker.set(broker.id, [])
      }
      for (const pos of positions) {
        const arr = positionsByBroker.get(pos.broker_id) ?? []
        arr.push(pos)
        positionsByBroker.set(pos.broker_id, arr)
      }

      // Store values in EUR (base currency) — no display conversion here
      const values: BrokerValueEur[] = brokers.map(broker => {
        const bPositions = positionsByBroker.get(broker.id) ?? []
        let valueEur = 0
        let investedEur = 0

        for (const pos of bPositions) {
          const quote = priceMap[pos.symbol]
          const price = quote?.price ?? pos.avg_buy_price
          const currency = quote?.currency ?? pos.currency
          valueEur += toEur(pos.shares * price, currency, exchangeRates)
          investedEur += toEur(pos.shares * pos.avg_buy_price, pos.currency, exchangeRates)
        }

        return {
          brokerId: broker.id,
          name: broker.name,
          color: broker.color,
          valueEur,
          investedEur,
          positionCount: bPositions.length,
        }
      })

      return { values, rates: exchangeRates }
    },
    enabled: true,
    // When broker IDs change (add/delete), the queryKey changes and a new fetch
    // kicks off. Keep showing the previous data while that fetch runs to avoid
    // a brief "empty dashboard" flash during the transition.
    placeholderData: keepPreviousData,
  })

  // Convert EUR base values to display currency — recalculates instantly on currency switch
  const { brokerValues, totalValue, totalInvested, totalGainLoss, totalGainLossPct } =
    useMemo(() => {
      const brokerValuesEur = fetchedData?.values ?? []
      const rates = fetchedData?.rates ?? null

      if (!rates || brokerValuesEur.length === 0) {
        return {
          brokerValues: [] as BrokerValue[],
          totalValue: 0,
          totalInvested: 0,
          totalGainLoss: 0,
          totalGainLossPct: 0,
        }
      }

      let sumValue = 0
      let sumInvested = 0

      const bvs: BrokerValue[] = brokerValuesEur.map(b => {
        const value = convertToDisplay(b.valueEur, displayCurrency, rates)
        const invested = convertToDisplay(b.investedEur, displayCurrency, rates)
        const gainLoss = value - invested
        const gainLossPct = invested > 0 ? (gainLoss / invested) * 100 : 0
        sumValue += value
        sumInvested += invested
        return {
          brokerId: b.brokerId,
          name: b.name,
          color: b.color,
          value,
          invested,
          gainLoss,
          gainLossPct,
          positionCount: b.positionCount,
        }
      })

      const gl = sumValue - sumInvested
      return {
        brokerValues: bvs,
        totalValue: sumValue,
        totalInvested: sumInvested,
        totalGainLoss: gl,
        totalGainLossPct: sumInvested > 0 ? (gl / sumInvested) * 100 : 0,
      }
    }, [fetchedData, displayCurrency])

  return {
    brokerValues,
    totalValue,
    totalInvested,
    totalGainLoss,
    totalGainLossPct,
    loading,
    error: error?.message ?? null,
    refetch: () => refetch(),
    rates: fetchedData?.rates ?? null,
    displayCurrency,
  }
}
