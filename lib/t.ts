import { useCallback } from 'react'
import i18n from './i18n'
import { useTranslation } from 'react-i18next'

/**
 * Translation helper — thin wrapper around `i18n.t()`.
 *
 * **IMPORTANT: this function is NOT reactive.** It reads `i18n.language` at
 * the moment of the call, so if you store its result in a module-level const,
 * a closure, or a React component's state, the value will NOT update when the
 * user changes language in Settings.
 *
 * Inside React components always prefer the reactive hook:
 * ```ts
 * const { _ } = useT()
 * ```
 *
 * Use the non-reactive `_` directly only when reactivity doesn't matter:
 * - `Alert.alert(_('error'), ...)` inside an event handler — the language is
 *   already correct at the moment the user triggers the action
 * - One-off translations in mutation `onError` / `onSuccess` callbacks
 * - Module-scope constants (accepting they won't update across sessions)
 */
export function _(key: string, options?: Record<string, unknown>): string {
  return i18n.t(key, options) as string
}

/**
 * Reactive translation hook. Use this inside React components — it re-renders
 * the consumer automatically when the user changes language via Settings.
 *
 * ```ts
 * const { _ } = useT()
 * return <Text>{_('dashboard')}</Text>
 * ```
 */
export function useT() {
  const { t } = useTranslation()
  const _ = useCallback(
    (key: string, options?: Record<string, unknown>) => t(key, options) as string,
    [t]
  )
  return { _ }
}
