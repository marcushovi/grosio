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

// `labelKey` resolves through i18n at render time so picker matches app lang.
export const DOMICILES: { value: Domicile; flag: string; labelKey: string }[] = [
  { value: 'SK', flag: '🇸🇰', labelKey: 'domicileSK' },
  { value: 'CZ', flag: '🇨🇿', labelKey: 'domicileCZ' },
]
