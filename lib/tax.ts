/**
 * Tax-status computation for long-held positions.
 *
 * Slovakia and Czechia each exempt capital gains on securities after a
 * holding period — 365 days (SK) and 1095 days (CZ). This module maps a
 * list of positions onto that timeline and returns, per broker, how much
 * is already tax-free vs still taxable, using live prices and the current
 * FX rates. All math is pure — callers fetch positions/prices/rates via
 * TanStack Query and pass them in.
 */
import type { Position, PositionCurrency } from '../types'
import type { ExchangeRates, DisplayCurrency } from './currency'
import { toEur, convertToDisplay } from './currency'
import type { PriceMap } from './portfolio'

export type Domicile = 'SK' | 'CZ'
export type { DisplayCurrency }

/** Holding-period thresholds (days) for the long-term tax exemption. */
export const TAX_THRESHOLD_DAYS: Record<Domicile, number> = {
  SK: 365,
  CZ: 1095,
}

/** EUR-base per-position tax status. Currency-invariant — the tax screen
 *  projects `currentValueEur` into the display currency in a `useMemo` so
 *  switching EUR/USD/CZK doesn't refetch prices or FX. */
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

/** Display-currency projection of `PositionTaxStatusBase`. Shape kept
 *  structurally compatible with the previous `PositionTaxStatus` so the
 *  tax screen didn't need a prop rename. */
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

/**
 * Pure computation. Given fetched positions, brokers, a live-price map and
 * FX rates, bucket each position into tax-free / still-taxable for the
 * selected domicile. Produces values in the EUR base currency — the caller
 * projects to display currency via `projectTaxSummaryToDisplay`, keeping
 * the query cache display-currency-invariant. Positions without a `buy_date`
 * can't be judged and fall into `unknownDatePositions` so the UI can surface
 * them.
 */
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
      const price = hasLivePrice ? quote.price : pos.avg_buy_price
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

/** Project an EUR-base `TaxSummaryBase` into the requested display currency.
 *  Pure — no fetches, no React; safe to call from a `useMemo` on every render. */
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
