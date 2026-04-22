/**
 * Centralised portfolio P&L math.
 *
 * The dashboard, broker-detail and tax screens all need to combine a list of
 * positions with a map of live quotes and a set of FX rates to produce values,
 * invested amounts, gain/loss and %. The formulas used to be duplicated —
 * that's how the "profit always shows 0" bug hid in plain sight. Everything
 * goes through these helpers now.
 */
import type { Position, PositionCurrency } from '../types'
import type { ExchangeRates, DisplayCurrency } from './currency'
import { toEur, convertToDisplay } from './currency'
import type { QuoteResult } from './yahooFinance'

export type PriceMap = Record<string, QuoteResult>

/** Per-position value + cost in the EUR base currency. */
export interface PositionValueEur {
  position: Position
  /** Has a live quote been fetched for this position's symbol? */
  hasLivePrice: boolean
  /** Current price per share in `currentCurrency`. */
  currentPrice: number
  /** Currency in which `currentPrice` is expressed. */
  currentCurrency: PositionCurrency
  /** shares × currentPrice, converted to EUR. */
  valueEur: number
  /** shares × buy_price, converted to EUR. */
  costEur: number
}

/**
 * Compute a single position's EUR-denominated value and cost.
 *
 * When no live quote is available for the symbol (network failure, unknown
 * ticker, pre-fetch render) we fall back to the buy price so the row still
 * displays *something*. Gain/loss will be 0 in that case — use
 * `positionValue.hasLivePrice` if you want to flag "no live price" in the UI.
 *
 * Scope: current portfolio. Sold positions don't have a meaningful "current
 * value" (they're realized), so callers should only pass open positions —
 * which is what `fetchAllPositions` returns.
 */
export function computePositionValueEur(
  position: Position,
  priceMap: PriceMap,
  rates: ExchangeRates
): PositionValueEur {
  const quote = priceMap[position.symbol]
  const hasLivePrice = quote != null && Number.isFinite(quote.price) && quote.price > 0
  const currentPrice = hasLivePrice ? quote.price : position.buy_price
  const currentCurrency = hasLivePrice ? quote.currency : position.currency

  return {
    position,
    hasLivePrice,
    currentPrice,
    currentCurrency,
    valueEur: toEur(position.shares * currentPrice, currentCurrency, rates),
    costEur: toEur(position.shares * position.buy_price, position.currency, rates),
  }
}

/** Display-currency P&L derived from EUR-base numbers. */
export interface Pnl {
  currentValue: number
  invested: number
  gainLoss: number
  gainLossPct: number
}

/** Convert a single position's EUR-base numbers into display-currency P&L. */
export function computePositionPnl(
  posValue: PositionValueEur,
  displayCurrency: DisplayCurrency,
  rates: ExchangeRates
): Pnl {
  const currentValue = convertToDisplay(posValue.valueEur, displayCurrency, rates)
  const invested = convertToDisplay(posValue.costEur, displayCurrency, rates)
  const gainLoss = currentValue - invested
  const gainLossPct = invested > 0 ? (gainLoss / invested) * 100 : 0
  return { currentValue, invested, gainLoss, gainLossPct }
}
