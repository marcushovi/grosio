export interface Broker {
  id: string
  user_id: string
  name: string
  color: string
  created_at: string
}

/** Currencies a stock/ETF can be priced in. Stocks/ETFs on Yahoo Finance are
 *  overwhelmingly quoted in USD or EUR; anything else is narrowed to USD at
 *  the Yahoo boundary so the FX rate table (EUR→{USD,CZK} from Frankfurter)
 *  stays exhaustive. Distinct from `DisplayCurrency`, which also includes CZK. */
export type PositionCurrency = 'EUR' | 'USD'

export interface Position {
  id: string
  broker_id: string
  user_id: string
  symbol: string
  name: string
  shares: number
  avg_buy_price: number
  currency: PositionCurrency
  buy_date: string | null // 'YYYY-MM-DD' or null for legacy rows
  created_at: string
}

export interface BrokerValue {
  brokerId: string
  name: string
  color: string
  value: number
  invested: number
  gainLoss: number
  gainLossPct: number
  positionCount: number
}

/** Uniform mutation result shape for hook callers. `error: null` means success. */
export interface MutationResult {
  error: { message: string } | null
}

/** A single gainer/loser entry surfaced on the dashboard. */
export interface Mover {
  symbol: string
  name: string
  /** (currentPrice - avgBuyPrice) / avgBuyPrice × 100 — currency-invariant. */
  pnlPercent: number
  /** shares × currentPrice projected into the user's display currency. */
  currentValue: number
}

/** Top 3 gainers and top 3 losers across all held positions. */
export interface MoversData {
  topGainers: Mover[]
  topLosers: Mover[]
}

export interface PositionWithPrice extends Position {
  currentPrice: number
  currentValue: number
  invested: number
  gainLoss: number
  gainLossPct: number
}
