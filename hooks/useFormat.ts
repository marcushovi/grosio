import { useTranslation } from 'react-i18next'
import {
  formatDate,
  formatTime,
  formatDateTime,
  formatNumber,
  formatCurrency,
  formatPercent,
  formatSignedNumber,
  formatSignedCurrency,
  type AppCurrency,
  type NumberFormatOptions,
  type PercentFormatOptions,
} from '../lib/format'

/**
 * Reactive language-bound bundle of every formatter in `lib/format.ts`.
 *
 * `useTranslation` makes this re-render when the user switches language in
 * Settings, so every call site picks up the new locale without passing it
 * around. Inside event handlers / callbacks where reactivity isn't needed,
 * call the bare `formatX(value, lang)` functions from `lib/format` instead.
 */
export function useFormat() {
  const { i18n } = useTranslation()
  const lang = i18n.language
  return {
    formatDate: (d: Date | string) => formatDate(d, lang),
    formatTime: (d: Date | string) => formatTime(d, lang),
    formatDateTime: (d: Date | string) => formatDateTime(d, lang),
    formatNumber: (v: number, o?: NumberFormatOptions) => formatNumber(v, lang, o),
    formatCurrency: (v: number, c: AppCurrency, o?: NumberFormatOptions) =>
      formatCurrency(v, c, lang, o),
    formatPercent: (v: number, o?: PercentFormatOptions) => formatPercent(v, lang, o),
    formatSignedNumber: (v: number, o?: NumberFormatOptions) => formatSignedNumber(v, lang, o),
    formatSignedCurrency: (v: number, c: AppCurrency, o?: NumberFormatOptions) =>
      formatSignedCurrency(v, c, lang, o),
  }
}
