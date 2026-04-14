/**
 * Barrel re-export so screens can import exchange-rate + formatting helpers
 * from a single consistent place (`lib/api/currency`) alongside the other
 * data-fetching functions.
 */
export {
  getExchangeRates,
  areFallbackRates,
  toEur,
  convertToDisplay,
  currencySymbol,
  formatAmount,
  formatGainLoss,
  formatRaw,
} from '../currency'
export type { ExchangeRates, DisplayCurrency } from '../currency'
