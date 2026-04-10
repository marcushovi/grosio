import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useColorScheme } from 'react-native'
import { Uniwind } from 'uniwind'
import i18n from './i18n'

export type Language = 'en' | 'sk' | 'cs' | 'de'
export type ThemePreference = 'light' | 'dark' | 'system'
export type DisplayCurrency = 'EUR' | 'USD' | 'CZK'

interface Settings {
  language: Language
  themePreference: ThemePreference
  currency: DisplayCurrency
}

interface SettingsContextValue extends Settings {
  setLanguage: (lang: Language) => void
  setThemePreference: (theme: ThemePreference) => void
  setCurrency: (currency: DisplayCurrency) => void
  resolvedTheme: 'light' | 'dark'
  isLoaded: boolean
}

const STORAGE_KEY = 'grosio_settings'

const defaults: Settings = {
  language: 'en',
  themePreference: 'dark',
  currency: 'EUR',
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme()
  const [settings, setSettings] = useState<Settings>(defaults)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
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
  }, [])

  const systemTheme = systemColorScheme === 'light' ? 'light' : 'dark'
  const resolvedTheme: 'light' | 'dark' =
    settings.themePreference === 'system' ? systemTheme : settings.themePreference

  // Sync theme to Uniwind whenever it changes
  useEffect(() => {
    Uniwind.setTheme(resolvedTheme)
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
