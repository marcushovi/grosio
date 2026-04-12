export interface Broker {
  id: string
  user_id: string
  name: string
  color: string
  created_at: string
}

export interface Position {
  id: string
  broker_id: string
  user_id: string
  symbol: string
  name: string
  shares: number
  avg_buy_price: number
  currency: string
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

export interface PositionWithPrice {
  id: string
  broker_id: string
  user_id: string
  symbol: string
  name: string
  shares: number
  avg_buy_price: number
  currency: string
  buy_date: string | null
  currentPrice: number
  currentValue: number
  invested: number
  gainLoss: number
  gainLossPct: number
}
