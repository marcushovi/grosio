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
  created_at: string
  // computed fields (not in DB)
  current_price?: number
  current_value?: number
  gain_loss?: number
  gain_loss_pct?: number
}
