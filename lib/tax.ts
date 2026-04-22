// Tax-status math for SK / CZ holding-period exemption.
//   SK = 365 days, CZ = 1095 days.
// Open positions evaluate the test against today; realized positions freeze
// it at the moment of sale. All math is pure.
import type { Position, PositionCurrency } from '@/types'
import type { ExchangeRates, DisplayCurrency } from '@/lib/currency'
import { toEur, convertToDisplay } from '@/lib/currency'
import type { PriceMap } from '@/lib/portfolio'

export type Domicile = 'SK' | 'CZ'
export type { DisplayCurrency }

export const TAX_THRESHOLD_DAYS: Record<Domicile, number> = {
  SK: 365,
  CZ: 1095,
}

// EUR-base shapes — UI projects to display currency in a useMemo so switching
// EUR/USD/CZK does not refetch.
export interface PositionTaxStatusBase {
  position: Position
  buyDate: Date
  daysHeld: number
  thresholdDays: number
  isTaxFree: boolean
  daysUntilTaxFree: number
  currentValueEur: number
}

export interface BrokerTaxSummaryBase {
  brokerId: string
  brokerName: string
  brokerColor: string
  taxFreeValueEur: number
  taxableValueEur: number
  positions: PositionTaxStatusBase[]
  unknownDatePositions: Position[]
}

export interface TaxSummaryBase {
  totalTaxFreeValueEur: number
  totalTaxableValueEur: number
  brokers: BrokerTaxSummaryBase[]
  domicile: Domicile
  rates: ExchangeRates
}

export interface PositionTaxStatus {
  position: Position
  buyDate: Date
  daysHeld: number
  thresholdDays: number
  isTaxFree: boolean
  daysUntilTaxFree: number
  currentValueDisplay: number
}

export interface BrokerTaxSummary {
  brokerId: string
  brokerName: string
  brokerColor: string
  taxFreeValue: number
  taxableValue: number
  positions: PositionTaxStatus[]
  unknownDatePositions: Position[]
}

export interface TaxSummary {
  totalTaxFreeValue: number
  totalTaxableValue: number
  brokers: BrokerTaxSummary[]
  domicile: Domicile
  displayCurrency: DisplayCurrency
}

// Bucket open positions into tax free / taxable per broker. Positions without
// a buy_date land in `unknownDatePositions` so the UI can flag them.
export function computeTaxStatusBase(
  positions: Position[],
  brokers: { id: string; name: string; color: string }[],
  domicile: Domicile,
  rates: ExchangeRates,
  priceMap: PriceMap
): TaxSummaryBase {
  const threshold = TAX_THRESHOLD_DAYS[domicile]
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let totalTaxFreeEur = 0
  let totalTaxableEur = 0

  const positionsByBroker = new Map<string, Position[]>()
  for (const broker of brokers) {
    positionsByBroker.set(broker.id, [])
  }
  for (const pos of positions) {
    const arr = positionsByBroker.get(pos.broker_id) ?? []
    arr.push(pos)
    positionsByBroker.set(pos.broker_id, arr)
  }

  const brokerSummaries: BrokerTaxSummaryBase[] = brokers.map(broker => {
    const bPositions = positionsByBroker.get(broker.id) ?? []
    const taxStatuses: PositionTaxStatusBase[] = []
    const unknownDate: Position[] = []
    let bTaxFreeEur = 0
    let bTaxableEur = 0

    for (const pos of bPositions) {
      if (!pos.buy_date) {
        unknownDate.push(pos)
        continue
      }

      const buyDate = new Date(pos.buy_date)
      buyDate.setHours(0, 0, 0, 0)
      const daysHeld = Math.floor((today.getTime() - buyDate.getTime()) / (1000 * 60 * 60 * 24))
      const isTaxFree = daysHeld >= threshold
      const daysUntilTaxFree = isTaxFree ? 0 : threshold - daysHeld

      const quote = priceMap[pos.symbol]
      const hasLivePrice = quote != null && Number.isFinite(quote.price) && quote.price > 0
      const price = hasLivePrice ? quote.price : pos.buy_price
      const positionCurrency: PositionCurrency = hasLivePrice ? quote.currency : pos.currency
      const currentValueEur = toEur(pos.shares * price, positionCurrency, rates)

      if (isTaxFree) {
        bTaxFreeEur += currentValueEur
        totalTaxFreeEur += currentValueEur
      } else {
        bTaxableEur += currentValueEur
        totalTaxableEur += currentValueEur
      }

      taxStatuses.push({
        position: pos,
        buyDate,
        daysHeld,
        thresholdDays: threshold,
        isTaxFree,
        daysUntilTaxFree,
        currentValueEur,
      })
    }

    taxStatuses.sort((a, b) => {
      if (a.isTaxFree && !b.isTaxFree) return -1
      if (!a.isTaxFree && b.isTaxFree) return 1
      return a.daysUntilTaxFree - b.daysUntilTaxFree
    })

    return {
      brokerId: broker.id,
      brokerName: broker.name,
      brokerColor: broker.color,
      taxFreeValueEur: bTaxFreeEur,
      taxableValueEur: bTaxableEur,
      positions: taxStatuses,
      unknownDatePositions: unknownDate,
    }
  })

  return {
    totalTaxFreeValueEur: totalTaxFreeEur,
    totalTaxableValueEur: totalTaxableEur,
    brokers: brokerSummaries,
    domicile,
    rates,
  }
}

// Tax status frozen at sale time: sold_at − buy_date vs threshold. Returns
// null fields when either date is missing (legacy / partial rows).
export function computeRealizedTaxStatus(
  position: Position,
  domicile: Domicile
): { isTaxFree: boolean | null; daysHeld: number | null } {
  if (!position.buy_date || !position.sold_at) return { isTaxFree: null, daysHeld: null }
  const buy = new Date(`${position.buy_date}T00:00:00`)
  const sold = new Date(`${position.sold_at}T00:00:00`)
  const daysHeld = Math.floor((sold.getTime() - buy.getTime()) / (1000 * 60 * 60 * 24))
  return { isTaxFree: daysHeld >= TAX_THRESHOLD_DAYS[domicile], daysHeld }
}

// Realized P&L in the position's native currency.
export function realizedPnlNative(position: Position): number | null {
  if (position.sold_price === null || position.sold_shares === null) return null
  return (position.sold_price - position.buy_price) * position.sold_shares
}

// Sum realized P&L across positions, split by tax classification, in display
// currency. Per-position P&L is converted via EUR base. Incomplete rows skip.
export function aggregateRealizedTax(
  positions: Position[],
  domicile: Domicile,
  rates: ExchangeRates,
  displayCurrency: DisplayCurrency
): { taxFreeTotal: number; taxableTotal: number } {
  let taxFreeTotal = 0
  let taxableTotal = 0
  for (const pos of positions) {
    const pnl = realizedPnlNative(pos)
    if (pnl === null) continue
    const { isTaxFree } = computeRealizedTaxStatus(pos, domicile)
    if (isTaxFree === null) continue
    const pnlDisplay = convertToDisplay(toEur(pnl, pos.currency, rates), displayCurrency, rates)
    if (isTaxFree) taxFreeTotal += pnlDisplay
    else taxableTotal += pnlDisplay
  }
  return { taxFreeTotal, taxableTotal }
}

// Project EUR-base summary into display currency. Pure — safe in useMemo.
export function projectTaxSummaryToDisplay(
  base: TaxSummaryBase | undefined,
  displayCurrency: DisplayCurrency
): TaxSummary | undefined {
  if (!base) return undefined
  const project = (amountEur: number): number =>
    convertToDisplay(amountEur, displayCurrency, base.rates)
  return {
    totalTaxFreeValue: project(base.totalTaxFreeValueEur),
    totalTaxableValue: project(base.totalTaxableValueEur),
    domicile: base.domicile,
    displayCurrency,
    brokers: base.brokers.map(b => ({
      brokerId: b.brokerId,
      brokerName: b.brokerName,
      brokerColor: b.brokerColor,
      taxFreeValue: project(b.taxFreeValueEur),
      taxableValue: project(b.taxableValueEur),
      unknownDatePositions: b.unknownDatePositions,
      positions: b.positions.map(p => ({
        position: p.position,
        buyDate: p.buyDate,
        daysHeld: p.daysHeld,
        thresholdDays: p.thresholdDays,
        isTaxFree: p.isTaxFree,
        daysUntilTaxFree: p.daysUntilTaxFree,
        currentValueDisplay: project(p.currentValueEur),
      })),
    })),
  }
}
