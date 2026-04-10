import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { usePrices } from './usePrices'
import { getExchangeRates, toEur, convertToDisplay } from '../lib/currency'
import { useSettings } from '../lib/settingsContext'
import type { Broker, Position, BrokerValue } from '../types'
import type { ExchangeRates, DisplayCurrency } from '../lib/currency'

export type { BrokerValue }

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
  const [brokerValues, setBrokerValues] = useState<BrokerValue[]>([])
  const [totalValue, setTotalValue] = useState(0)
  const [totalInvested, setTotalInvested] = useState(0)
  const [totalGainLoss, setTotalGainLoss] = useState(0)
  const [totalGainLossPct, setTotalGainLossPct] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rates, setRates] = useState<ExchangeRates | null>(null)

  const { fetchPrices } = usePrices()

  const fetchAllData = useCallback(async () => {
    if (brokers.length === 0) {
      setBrokerValues([])
      setTotalValue(0)
      setTotalInvested(0)
      setTotalGainLoss(0)
      setTotalGainLossPct(0)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data: allPositions, error: posErr } = await supabase.from('positions').select('*')
      if (posErr) throw posErr

      const positions: Position[] = allPositions ?? []
      const exchangeRates = await getExchangeRates()
      setRates(exchangeRates)

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

      let sumValue = 0
      let sumInvested = 0

      const values: BrokerValue[] = brokers.map(broker => {
        const bPositions = positionsByBroker.get(broker.id) ?? []
        let bValue = 0
        let bInvested = 0

        for (const pos of bPositions) {
          const quote = priceMap[pos.symbol]
          const price = quote?.price ?? pos.avg_buy_price
          const currency = quote?.currency ?? pos.currency
          // Convert to EUR first (base), then to display currency
          const posValueEur = toEur(pos.shares * price, currency, exchangeRates)
          const posCostEur = toEur(pos.shares * pos.avg_buy_price, pos.currency, exchangeRates)
          bValue += convertToDisplay(posValueEur, displayCurrency, exchangeRates)
          bInvested += convertToDisplay(posCostEur, displayCurrency, exchangeRates)
        }

        const bGainLoss = bValue - bInvested
        const bGainLossPct = bInvested > 0 ? (bGainLoss / bInvested) * 100 : 0

        sumValue += bValue
        sumInvested += bInvested

        return {
          brokerId: broker.id,
          name: broker.name,
          color: broker.color,
          value: bValue,
          invested: bInvested,
          gainLoss: bGainLoss,
          gainLossPct: bGainLossPct,
          positionCount: bPositions.length,
        }
      })

      const totalGL = sumValue - sumInvested
      const totalGLPct = sumInvested > 0 ? (totalGL / sumInvested) * 100 : 0

      setBrokerValues(values)
      setTotalValue(sumValue)
      setTotalInvested(sumInvested)
      setTotalGainLoss(totalGL)
      setTotalGainLossPct(totalGLPct)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chyba pri načítaní dát')
    } finally {
      setLoading(false)
    }
  }, [brokers, fetchPrices, displayCurrency])

  useEffect(() => {
    fetchAllData()
  }, [fetchAllData])

  return {
    brokerValues,
    totalValue,
    totalInvested,
    totalGainLoss,
    totalGainLossPct,
    loading,
    error,
    refetch: fetchAllData,
    rates,
    displayCurrency,
  }
}
