import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { usePrices } from './usePrices'
import { getEurUsdRate, toEur } from '../lib/currency'
import type { Broker, Position, BrokerValue } from '../types'

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
}

export function useDashboardData(brokers: Broker[]): DashboardData {
  const [brokerValues, setBrokerValues] = useState<BrokerValue[]>([])
  const [totalValue, setTotalValue] = useState(0)
  const [totalInvested, setTotalInvested] = useState(0)
  const [totalGainLoss, setTotalGainLoss] = useState(0)
  const [totalGainLossPct, setTotalGainLossPct] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
      // Single query for ALL positions (not N queries)
      const { data: allPositions, error: posErr } = await supabase.from('positions').select('*')

      if (posErr) throw posErr

      const positions: Position[] = allPositions ?? []

      // Get EUR/USD rate once
      const eurUsdRate = await getEurUsdRate()

      // Batch-fetch all unique symbols at once
      const allSymbols = [...new Set(positions.map(p => p.symbol))]
      const priceMap = await fetchPrices(allSymbols)

      // Group positions by broker_id
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
          const posValue = toEur(pos.shares * price, currency, eurUsdRate)
          const posCost = toEur(pos.shares * pos.avg_buy_price, pos.currency, eurUsdRate)
          bValue += posValue
          bInvested += posCost
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
  }, [brokers, fetchPrices])

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
  }
}
