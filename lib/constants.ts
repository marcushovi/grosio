import type { DisplayCurrency } from '@/lib/currency'
import type { Language } from '@/lib/i18n'
import type { Domicile } from '@/lib/tax'

export const APP_NAME = 'Grosio'

export const CURRENCIES: { value: DisplayCurrency; label: string }[] = [
  { value: 'EUR', label: '€ Euro' },
  { value: 'USD', label: '$ US Dollar' },
  { value: 'CZK', label: 'Kč Koruna' },
]

// Endonyms — each language name in its own language. Matches iOS/Android.
export const LANGUAGES: { value: Language; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'sk', label: 'Slovenčina' },
  { value: 'cs', label: 'Čeština' },
  { value: 'de', label: 'Deutsch' },
]

// Value + flag only. Labels and helper strings are called with literal i18n
// keys at render time so extractor tools can discover them via static scan.
export const DOMICILES: { value: Domicile; flag: string }[] = [
  { value: 'SK', flag: '🇸🇰' },
  { value: 'CZ', flag: '🇨🇿' },
]
