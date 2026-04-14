import { createContext, useContext, useEffect, useLayoutEffect, useState } from 'react'
import type { ReactNode } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useColorScheme } from 'react-native'
import { Uniwind } from 'uniwind'
import i18n from './i18n'
import type { DisplayCurrency } from './currency'
import type { Language } from './i18n'

export type { DisplayCurrency, Language }
export type ThemePreference = 'light' | 'dark' | 'system'
export type Domicile = 'SK' | 'CZ'

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
  resolvedTheme: 'light' | 'dark'
  isLoaded: boolean
}

const STORAGE_KEY = 'grosio_settings'

const defaults: Settings = {
  language: 'en',
  themePreference: 'dark',
  currency: 'EUR',
  domicile: 'SK',
}

// Eagerly apply the default theme at module load so the very first paint
// is already in the right colours — if we only called setTheme inside a
// useEffect, the first render would use Uniwind's OS-derived default and
// the background would flash (or stay) white on light-mode devices.
Uniwind.setTheme(defaults.themePreference)

const SettingsContext = createContext<SettingsContextValue | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme()
  const [settings, setSettings] = useState<Settings>(defaults)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(raw => {
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as Partial<Settings>
            const merged = { ...defaults, ...parsed }
            setSettings(merged)
            if (merged.language) i18n.changeLanguage(merged.language)
          } catch {
            // corrupt storage — use defaults
          }
        }
        setIsLoaded(true)
      })
      .catch(() => setIsLoaded(true))
  }, [])

  const systemTheme = systemColorScheme === 'light' ? 'light' : 'dark'
  const resolvedTheme: 'light' | 'dark' =
    settings.themePreference === 'system' ? systemTheme : settings.themePreference

  // Sync the resolved theme into Uniwind. `useLayoutEffect` fires
  // synchronously after render but before paint, which avoids a white-flash
  // on dark-mode users with a light-mode OS while also not triggering a
  // re-style of already-mounted components during render (React warns
  // about setState-in-render otherwise). The eager module-load call above
  // handles the very first paint.
  useLayoutEffect(() => {
    if (Uniwind.currentTheme !== resolvedTheme) {
      Uniwind.setTheme(resolvedTheme)
    }
  }, [resolvedTheme])

  const save = (next: Settings) => {
    setSettings(next)
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {})
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
