import type { Broker, Position, BrokerValue, Mover, MoversData } from '@/types'
import type { ExchangeRates, DisplayCurrency } from '@/lib/currency'
import { convertToDisplay, toEur } from '@/lib/currency'
import { computePositionValueEur } from '@/lib/portfolio'
import type { PriceMap } from '@/lib/api/yahoo'

const MOVERS_LIMIT = 3

// Currency-invariant intermediate — `valueEur` becomes `Mover.currentValue`
// after display projection.
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

export interface BrokerValueEur {
  brokerId: string
  name: string
  color: string
  valueEur: number
  investedEur: number
  positionCount: number
}

// EUR base — switching display currency does not refetch.
export interface DashboardBase {
  brokerValues: BrokerValueEur[]
  movers: MoversBase
  rates: ExchangeRates
}

export interface DashboardTotals {
  brokerValues: BrokerValue[]
  movers: MoversData
  totalValue: number
  totalInvested: number
  totalGainLoss: number
  totalGainLossPct: number
}

// Top / bottom movers by % P&L. Rows without a live quote are skipped. A
// zero buy_price yields pnlPercent = 0 so gifted shares still appear.
function computeMoversBase(
  positions: Position[],
  priceMap: PriceMap,
  rates: ExchangeRates
): MoversBase {
  const movers: MoverBase[] = []
  for (const pos of positions) {
    const quote = priceMap[pos.symbol]
    if (!quote || !Number.isFinite(quote.price) || quote.price <= 0) continue
    const pnlPercent = pos.buy_price > 0 ? ((quote.price - pos.buy_price) / pos.buy_price) * 100 : 0
    movers.push({
      symbol: pos.symbol,
      name: pos.name,
      pnlPercent,
      valueEur: toEur(pos.shares * quote.price, quote.currency, rates),
    })
  }
  const sorted = [...movers].sort((a, b) => b.pnlPercent - a.pnlPercent)
  return {
    topGainers: sorted.filter(m => m.pnlPercent > 0).slice(0, MOVERS_LIMIT),
    topLosers: sorted
      .filter(m => m.pnlPercent < 0)
      .slice(-MOVERS_LIMIT)
      .reverse(),
  }
}

// Per-broker totals + movers in EUR base. Caller projects into display
// currency separately.
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
