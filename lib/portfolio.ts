// Per-position P&L math shared by dashboard, broker-detail and tax screens.
// Pure — callers fetch positions/prices/rates and pass them in.
import type { Position, PositionCurrency } from '@/types'
import type { ExchangeRates, DisplayCurrency } from '@/lib/currency'
import { toEur, convertToDisplay } from '@/lib/currency'
import type { PriceMap } from '@/lib/api/yahoo'

export interface PositionValueEur {
  position: Position
  hasLivePrice: boolean
  currentPrice: number
  currentCurrency: PositionCurrency
  valueEur: number
  costEur: number
}

// Single position in EUR base. Falls back to buy_price if no live quote so
// the row still renders (gain/loss = 0). Open positions only.
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

export interface Pnl {
  currentValue: number
  invested: number
  gainLoss: number
  gainLossPct: number
}

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
