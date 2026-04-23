export interface Broker {
  id: string
  user_id: string
  name: string
  color: string
  created_at: string
}

// EUR/USD/CZK cover the Frankfurter rate table. Yahoo currencies outside
// this set are narrowed to USD at the API boundary.
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
  buy_date: string | null
  created_at: string
  // All three sold_* are NULL together (open) or NOT NULL together (sold).
  // DB constraint enforces sold_shares = shares — partial sales not supported.
  sold_at: string | null
  sold_price: number | null
  sold_shares: number | null
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

// Hook return shape for legacy wrappers around mutations.
export interface MutationResult {
  error: { message: string } | null
}

export interface Mover {
  symbol: string
  name: string
  pnlPercent: number
  currentValue: number
}

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

export function isSold(p: Position): boolean {
  return p.sold_at !== null
}
