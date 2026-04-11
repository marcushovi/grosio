import { View, Text, ScrollView, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useThemeColor } from 'heroui-native'
import { useT } from '../../lib/t'
import { useSettings } from '../../lib/settingsContext'
import { CURRENCIES } from '../../lib/constants'
import type { Language, ThemePreference, DisplayCurrency } from '../../lib/settingsContext'

interface OptionRowProps {
  label: string
  options: { value: string; label: string }[]
  selected: string
  onSelect: (value: string) => void
}

function OptionRow({ label, options, selected, onSelect }: OptionRowProps) {
  const accentFg = useThemeColor('accent-foreground') as string

  return (
    <View className="mb-6">
      <Text className="text-muted text-xs mb-2 px-1">{label}</Text>
      <View className="bg-surface rounded-2xl overflow-hidden">
        {options.map((opt, i) => (
          <Pressable
            key={opt.value}
            onPress={() => onSelect(opt.value)}
            className={`flex-row items-center justify-between px-4 py-4 ${
              i < options.length - 1 ? 'border-b border-default' : ''
            }`}
          >
            <Text className="text-foreground text-base">{opt.label}</Text>
            <View
              className={`w-5 h-5 rounded-full border-2 items-center justify-center ${
                selected === opt.value ? 'border-accent bg-accent' : 'border-muted'
              }`}
            >
              {selected === opt.value && (
                <View className="w-2 h-2 rounded-full" style={{ backgroundColor: accentFg }} />
              )}
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  )
}

export default function SettingsScreen() {
  const { _ } = useT()
  const { language, themePreference, currency, setLanguage, setThemePreference, setCurrency } =
    useSettings()

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text className="text-foreground text-3xl font-bold mb-6">{_('settings')}</Text>

        <OptionRow
          label={_('language')}
          selected={language}
          onSelect={v => setLanguage(v as Language)}
          options={[
            { value: 'en', label: 'English' },
            { value: 'sk', label: 'Slovenčina' },
            { value: 'cs', label: 'Čeština' },
            { value: 'de', label: 'Deutsch' },
          ]}
        />

        <OptionRow
          label={_('theme')}
          selected={themePreference}
          onSelect={v => setThemePreference(v as ThemePreference)}
          options={[
            { value: 'light', label: _('themeLight') },
            { value: 'dark', label: _('themeDark') },
            { value: 'system', label: _('themeSystem') },
          ]}
        />

        <OptionRow
          label={_('displayCurrency')}
          selected={currency}
          onSelect={v => setCurrency(v as DisplayCurrency)}
          options={CURRENCIES.map(c => ({ value: c.value, label: c.label }))}
        />
      </ScrollView>
    </SafeAreaView>
  )
}
