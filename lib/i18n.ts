import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import * as Localization from 'expo-localization'

import en from '@/locales/en.json'
import sk from '@/locales/sk.json'
import cs from '@/locales/cs.json'
import de from '@/locales/de.json'

export type Language = 'en' | 'sk' | 'cs' | 'de'

const SUPPORTED: Language[] = ['en', 'sk', 'cs', 'de']

function getDeviceLanguage(): Language {
  const locale = Localization.getLocales()[0]?.languageCode ?? 'en'
  return SUPPORTED.includes(locale as Language) ? (locale as Language) : 'en'
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    sk: { translation: sk },
    cs: { translation: cs },
    de: { translation: de },
  },
  lng: getDeviceLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

export default i18n
