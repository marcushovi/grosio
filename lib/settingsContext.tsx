import { createContext, useContext, useEffect, useLayoutEffect, useState } from 'react'
import type { ReactNode } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Uniwind, useUniwind } from 'uniwind'
import i18n from '@/lib/i18n'
import type { DisplayCurrency } from '@/lib/currency'
import type { Language } from '@/lib/i18n'

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
  /** 'light' | 'dark' — the theme currently applied after adaptive resolution. */
  resolvedTheme: 'light' | 'dark'
  isLoaded: boolean
}

const STORAGE_KEY = 'grosio_settings'

// New users start on 'system' so the app follows the OS setting out of the
// box (per Expo's `userInterfaceStyle: "automatic"` convention). Users can
// pin 'light' or 'dark' from Settings → Theme at any time.
const defaults: Settings = {
  language: 'en',
  themePreference: 'system',
  currency: 'EUR',
  domicile: 'SK',
}

// Apply the stored preference to Uniwind at module load so the very first
// paint uses the right palette. Uniwind accepts 'light' | 'dark' | 'system'
// directly; 'system' enables its native adaptive mode, which tracks iOS /
// Android Appearance changes automatically (no manual `useColorScheme` loop).
Uniwind.setTheme(defaults.themePreference)

const SettingsContext = createContext<SettingsContextValue | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaults)
  const [isLoaded, setIsLoaded] = useState(false)
  // Uniwind is the single source of truth for the currently *applied* theme.
  // When themePreference === 'system' it reflects the current OS scheme and
  // updates automatically; otherwise it's the pinned 'light' | 'dark' value.
  // `useUniwind().theme` is typed as `ThemeName` (which includes 'system' in
  // the base type) but at runtime is always resolved to 'light' | 'dark'
  // because Uniwind's `setTheme('system')` maps `#currentTheme` to the actual
  // color scheme. The `=== 'light'` check narrows safely.
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
          } catch {
            // corrupt storage — use defaults
          }
        }
        setIsLoaded(true)
      })
      .catch(() => setIsLoaded(true))
  }, [])

  // Sync Uniwind whenever the user's stored preference changes. `useLayoutEffect`
  // fires synchronously before paint so transitions between themes don't flash.
  useLayoutEffect(() => {
    Uniwind.setTheme(settings.themePreference)
  }, [settings.themePreference])

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
