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
import type { Position } from '../types'
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
 * Convert an amount in `fromCurrency` into the display currency using the
 * EUR-base FX rates. Composed from existing helpers — positions can be
 * priced in EUR or USD, and display can be any of EUR/USD/CZK, so we
 * normalise to EUR first and then project.
 */
function toDisplay(
  amount: number,
  fromCurrency: string,
  displayCurrency: DisplayCurrency,
  rates: ExchangeRates
): number {
  return convertToDisplay(toEur(amount, fromCurrency, rates), displayCurrency, rates)
}

/**
 * Pure computation. Given fetched positions, brokers, a live-price map and
 * FX rates, bucket each position into tax-free / still-taxable for the
 * selected domicile. Positions without a `buy_date` can't be judged and
 * fall into `unknownDatePositions` so the UI can surface them.
 */
export function computeTaxStatus(
  positions: Position[],
  brokers: { id: string; name: string; color: string }[],
  domicile: Domicile,
  displayCurrency: DisplayCurrency,
  rates: ExchangeRates,
  priceMap: PriceMap
): TaxSummary {
  const threshold = TAX_THRESHOLD_DAYS[domicile]
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let totalTaxFree = 0
  let totalTaxable = 0

  const positionsByBroker = new Map<string, Position[]>()
  for (const broker of brokers) {
    positionsByBroker.set(broker.id, [])
  }
  for (const pos of positions) {
    const arr = positionsByBroker.get(pos.broker_id) ?? []
    arr.push(pos)
    positionsByBroker.set(pos.broker_id, arr)
  }

  const brokerSummaries: BrokerTaxSummary[] = brokers.map(broker => {
    const bPositions = positionsByBroker.get(broker.id) ?? []
    const taxStatuses: PositionTaxStatus[] = []
    const unknownDate: Position[] = []
    let bTaxFree = 0
    let bTaxable = 0

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
      const positionCurrency = hasLivePrice ? quote.currency : pos.currency
      const currentValueDisplay = toDisplay(
        pos.shares * price,
        positionCurrency,
        displayCurrency,
        rates
      )

      if (isTaxFree) {
        bTaxFree += currentValueDisplay
        totalTaxFree += currentValueDisplay
      } else {
        bTaxable += currentValueDisplay
        totalTaxable += currentValueDisplay
      }

      taxStatuses.push({
        position: pos,
        buyDate,
        daysHeld,
        thresholdDays: threshold,
        isTaxFree,
        daysUntilTaxFree,
        currentValueDisplay,
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
      taxFreeValue: bTaxFree,
      taxableValue: bTaxable,
      positions: taxStatuses,
      unknownDatePositions: unknownDate,
    }
  })

  return {
    totalTaxFreeValue: totalTaxFree,
    totalTaxableValue: totalTaxable,
    brokers: brokerSummaries,
    domicile,
    displayCurrency,
  }
}
