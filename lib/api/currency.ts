/**
 * Barrel re-export so screens can import exchange-rate helpers from a single
 * consistent place (`lib/api/currency`) alongside the other data-fetching
 * functions. Display formatting lives in `lib/format` (via `useFormat`).
 */
export {
  getExchangeRates,
  areFallbackRates,
  toEur,
  convertToDisplay,
  currencySymbol,
} from '../currency'
export type { ExchangeRates, DisplayCurrency } from '../currency'
