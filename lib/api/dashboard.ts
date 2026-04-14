import type { Broker, Position, BrokerValue, Mover, MoversData } from '../../types'
import type { ExchangeRates, DisplayCurrency } from '../currency'
import { convertToDisplay, toEur } from '../currency'
import { computePositionValueEur } from '../portfolio'
import type { PriceMap } from '../portfolio'

/** Intermediate mover shape — currency-invariant, produced by
 *  `computeDashboardBase`. `valueEur` gets projected to display currency
 *  (→ `Mover.currentValue`) by `projectDashboardToDisplay`. */
interface MoverBase {
  symbol: string
  name: string
  pnlPercent: number
  valueEur: number
}

interface MoversBase {
  topGainers: MoverBase[]
  topLosers: MoverBase[]
}

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
  movers: MoversBase
  rates: ExchangeRates
}

/**
 * Bucket held positions into top 3 gainers + top 3 losers by percentage P&L
 * vs. their recorded buy price. Positions without a live quote are skipped —
 * we can't classify them. Positions with `avg_buy_price <= 0` are included
 * with `pnlPercent = 0` so a zero-cost share (e.g. a gifted position) still
 * shows up on the list.
 *
 * Pure function. `valueEur` is currency-invariant; `projectMoversToDisplay`
 * handles the display-currency conversion.
 */
function computeMoversBase(
  positions: Position[],
  priceMap: PriceMap,
  rates: ExchangeRates
): MoversBase {
  const movers: MoverBase[] = []
  for (const pos of positions) {
    const quote = priceMap[pos.symbol]
    if (!quote || !Number.isFinite(quote.price) || quote.price <= 0) continue
    const pnlPercent =
      pos.avg_buy_price > 0 ? ((quote.price - pos.avg_buy_price) / pos.avg_buy_price) * 100 : 0
    movers.push({
      symbol: pos.symbol,
      name: pos.name,
      pnlPercent,
      valueEur: toEur(pos.shares * quote.price, quote.currency, rates),
    })
  }
  const sorted = [...movers].sort((a, b) => b.pnlPercent - a.pnlPercent)
  return {
    topGainers: sorted.slice(0, 3),
    topLosers: sorted.slice(-3).reverse(),
  }
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

  return {
    brokerValues,
    movers: computeMoversBase(positions, priceMap, rates),
    rates,
  }
}

/** Aggregate P&L across all brokers in the display currency. */
export interface DashboardTotals {
  brokerValues: BrokerValue[]
  movers: MoversData
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
      movers: { topGainers: [], topLosers: [] },
      totalValue: 0,
      totalInvested: 0,
      totalGainLoss: 0,
      totalGainLossPct: 0,
    }
  }

  const projectMover = (m: MoverBase): Mover => ({
    symbol: m.symbol,
    name: m.name,
    pnlPercent: m.pnlPercent,
    currentValue: convertToDisplay(m.valueEur, displayCurrency, base.rates),
  })
  const movers: MoversData = {
    topGainers: base.movers.topGainers.map(projectMover),
    topLosers: base.movers.topLosers.map(projectMover),
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
    movers,
    totalValue,
    totalInvested,
    totalGainLoss,
    totalGainLossPct: totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0,
  }
}
