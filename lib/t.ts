import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import i18n from '@/lib/i18n'

// Non-reactive translation. Reads i18n.language at call time — fine inside
// event handlers / mutation callbacks. Use `useT` inside components.
export function _(key: string, options?: Record<string, unknown>): string {
  return i18n.t(key, options) as string
}

// Reactive translation hook. Rerenders when language changes.
export function useT() {
  const { t } = useTranslation()
  const _ = useCallback(
    (key: string, options?: Record<string, unknown>) => t(key, options) as string,
    [t]
  )
  return { _ }
}
