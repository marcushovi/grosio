import { useTranslation } from 'react-i18next'
import {
  formatDate,
  formatTime,
  formatDateTime,
  formatNumber,
  formatCurrency,
  formatPercent,
  formatSignedCurrency,
  type AppCurrency,
  type NumberFormatOptions,
  type PercentFormatOptions,
} from '@/lib/format'

// Reactive bundle bound to current language. Use `formatX(value, lang)` from
// `lib/format` directly in non-reactive contexts.
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
    formatSignedCurrency: (v: number, c: AppCurrency, o?: NumberFormatOptions) =>
      formatSignedCurrency(v, c, lang, o),
  }
}
