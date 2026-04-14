import type { Broker, Position, BrokerValue } from '../../types'
import type { ExchangeRates, DisplayCurrency } from '../currency'
import { convertToDisplay } from '../currency'
import { computePositionValueEur } from '../portfolio'
import type { PriceMap } from '../portfolio'

/** Per-broker aggregates in the EUR base currency. */
export interface BrokerValueEur {
  brokerId: string
  name: string
  color: string
  valueEur: number
  investedEur: number
  positionCount: number
}

/** Dashboard data in EUR base — invariant to display currency so the
 *  underlying query doesn't need to refetch when the user switches currency. */
export interface DashboardBase {
  brokerValues: BrokerValueEur[]
  rates: ExchangeRates
}

/**
 * Aggregate broker totals from the raw positions + price map + FX rates.
 * Pure function — no fetches, no React, no async.
 * Brokers with no positions show up with zero values (to render the empty state).
 */
export function computeDashboardBase(
  brokers: Broker[],
  positions: Position[],
  priceMap: PriceMap,
  rates: ExchangeRates
): DashboardBase {
  const positionsByBroker = new Map<string, Position[]>()
  for (const broker of brokers) {
    positionsByBroker.set(broker.id, [])
  }
  for (const pos of positions) {
    const arr = positionsByBroker.get(pos.broker_id) ?? []
    arr.push(pos)
    positionsByBroker.set(pos.broker_id, arr)
  }

  const brokerValues: BrokerValueEur[] = brokers.map(broker => {
    const bPositions = positionsByBroker.get(broker.id) ?? []
    let valueEur = 0
    let investedEur = 0
    for (const pos of bPositions) {
      const pv = computePositionValueEur(pos, priceMap, rates)
      valueEur += pv.valueEur
      investedEur += pv.costEur
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

  return { brokerValues, rates }
}

/** Aggregate P&L across all brokers in the display currency. */
export interface DashboardTotals {
  brokerValues: BrokerValue[]
  totalValue: number
  totalInvested: number
  totalGainLoss: number
  totalGainLossPct: number
}

/** Project EUR-base broker values into the display currency. Pure function. */
export function projectDashboardToDisplay(
  base: DashboardBase | undefined,
  displayCurrency: DisplayCurrency
): DashboardTotals {
  if (!base) {
    return {
      brokerValues: [],
      totalValue: 0,
      totalInvested: 0,
      totalGainLoss: 0,
      totalGainLossPct: 0,
    }
  }

  let totalValue = 0
  let totalInvested = 0
  const brokerValues: BrokerValue[] = base.brokerValues.map(b => {
    const value = convertToDisplay(b.valueEur, displayCurrency, base.rates)
    const invested = convertToDisplay(b.investedEur, displayCurrency, base.rates)
    const gainLoss = value - invested
    const gainLossPct = invested > 0 ? (gainLoss / invested) * 100 : 0
    totalValue += value
    totalInvested += invested
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

  const totalGainLoss = totalValue - totalInvested
  return {
    brokerValues,
    totalValue,
    totalInvested,
    totalGainLoss,
    totalGainLossPct: totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0,
  }
}
