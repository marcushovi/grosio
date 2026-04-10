import i18n from './i18n'
import { useTranslation } from 'react-i18next'

/** Non-reactive _ for use outside React (Alert callbacks, constants) */
export function _(key: string, options?: Record<string, unknown>): string {
  return i18n.t(key, options) as string
}

/** Reactive hook — use inside React components for auto re-render on language change */
export function useT() {
  const { t } = useTranslation()
  const _ = (key: string, options?: Record<string, unknown>) => t(key, options) as string
  return { _ }
}
