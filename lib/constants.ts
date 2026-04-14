import type { DisplayCurrency } from './currency'

export const APP_NAME = 'Grosio'

export const CURRENCIES: { value: DisplayCurrency; label: string }[] = [
  { value: 'EUR', label: '€ Euro' },
  { value: 'USD', label: '$ US Dollar' },
  { value: 'CZK', label: 'Kč Koruna' },
]
