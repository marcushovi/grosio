// Barrel reexport so screens can pull exchange rate helpers from one place
// alongside the other API functions. Display formatting lives in `lib/format`.
export {
  getExchangeRates,
  areFallbackRates,
  toEur,
  convertToDisplay,
  currencySymbol,
} from '@/lib/currency'
export type { ExchangeRates, DisplayCurrency } from '@/lib/currency'
