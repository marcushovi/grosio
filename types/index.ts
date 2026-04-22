export interface Broker {
  id: string
  user_id: string
  name: string
  color: string
  created_at: string
}

/** Currencies a stock/ETF can be priced in. Covers the EUR/USD majority on
 *  Yahoo plus CZK (Prague Stock Exchange, PRA). Anything else is narrowed to
 *  USD at the Yahoo boundary so the FX rate table (EUR→{USD,CZK} from
 *  Frankfurter) stays exhaustive. Same literal set as `DisplayCurrency`, but
 *  a distinct type because the two fields are semantically different. */
export type PositionCurrency = 'EUR' | 'USD' | 'CZK'

export interface Position {
  id: string
  broker_id: string
  user_id: string
  symbol: string
  name: string
  shares: number
  buy_price: number
  currency: PositionCurrency
  buy_date: string | null // 'YYYY-MM-DD' or null for legacy rows
  created_at: string
  // Sale fields. DB constraint: all three NULL (open) or all three NOT NULL
  // (sold). Partial sales are not supported — sold_shares = shares is enforced
  // at the DB layer, so a sale always closes the position.
  sold_at: string | null
  sold_price: number | null
  sold_shares: number | null
}

/** A position is "sold" when the sale fields are populated. */
export function isSold(p: Position): boolean {
  return p.sold_at !== null
}

/** Realized P&L in the position's native currency. `null` while the position
 *  is still open. Currency conversion is a display-layer concern. */
export function realizedPnl(p: Position): number | null {
  if (p.sold_price === null || p.sold_shares === null) return null
  return (p.sold_price - p.buy_price) * p.sold_shares
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
  /** (currentPrice - buyPrice) / buyPrice × 100 — currency-invariant. */
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
