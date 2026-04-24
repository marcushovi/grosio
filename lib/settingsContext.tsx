import { createContext, useContext, useEffect, useLayoutEffect, useState } from 'react'
import type { ReactNode } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Uniwind, useUniwind } from 'uniwind'
import i18n from '@/lib/i18n'
import type { DisplayCurrency } from '@/lib/currency'
import type { Language } from '@/lib/i18n'
import type { Domicile } from '@/lib/tax'

export type { DisplayCurrency, Language, Domicile }
export type ThemePreference = 'light' | 'dark' | 'system'

interface Settings {
  language: Language
  themePreference: ThemePreference
  currency: DisplayCurrency
  domicile: Domicile
}

interface SettingsContextValue extends Settings {
  setLanguage: (lang: Language) => void
  setThemePreference: (theme: ThemePreference) => void
  setCurrency: (currency: DisplayCurrency) => void
  setDomicile: (domicile: Domicile) => void
  // Currently applied theme after adaptive resolution.
  resolvedTheme: 'light' | 'dark'
  isLoaded: boolean
}

const STORAGE_KEY = 'grosio_settings'

const defaults: Settings = {
  language: 'en',
  themePreference: 'system',
  currency: 'EUR',
  domicile: 'SK',
}

// Apply at module load so first paint uses the right palette.
Uniwind.setTheme(defaults.themePreference)

const SettingsContext = createContext<SettingsContextValue | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaults)
  const [isLoaded, setIsLoaded] = useState(false)
  // Uniwind owns the applied theme; `setTheme('system')` tracks the OS scheme
  // and resolves to 'light' | 'dark'.
  const { theme } = useUniwind()
  const resolvedTheme: 'light' | 'dark' = theme === 'light' ? 'light' : 'dark'

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(raw => {
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as Partial<Settings>
            const merged = { ...defaults, ...parsed }
            setSettings(merged)
            if (merged.language) i18n.changeLanguage(merged.language)
          } catch (err) {
            console.warn('[settings] failed to parse stored settings, using defaults:', err)
          }
        }
        setIsLoaded(true)
      })
      .catch(() => setIsLoaded(true))
  }, [])

  // useLayoutEffect so theme transitions don't flash a frame.
  useLayoutEffect(() => {
    Uniwind.setTheme(settings.themePreference)
  }, [settings.themePreference])

  const save = (next: Settings) => {
    setSettings(next)
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(err => {
      console.warn('[settings] failed to persist settings:', err)
    })
  }

  return (
    <SettingsContext.Provider
      value={{
        ...settings,
        resolvedTheme,
        isLoaded,
        setLanguage: language => {
          i18n.changeLanguage(language)
          save({ ...settings, language })
        },
        setThemePreference: themePreference => save({ ...settings, themePreference }),
        setCurrency: currency => save({ ...settings, currency }),
        setDomicile: domicile => save({ ...settings, domicile }),
      }}
    >
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider')
  return ctx
}
