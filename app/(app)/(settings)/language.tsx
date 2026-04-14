import { Fragment } from 'react'
import { View, Text } from 'react-native'
import { Screen } from '../../../components/Screen'
import { useRouter } from 'expo-router'
import { RadioGroup, Radio, Label, Separator, Surface, useThemeColor } from 'heroui-native'
import { Button } from 'heroui-native/button'
import { ArrowLeft } from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { useT } from '../../../lib/t'
import { useSettings } from '../../../lib/settingsContext'
import type { Language } from '../../../lib/settingsContext'

const LANGUAGES: { value: Language; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'sk', label: 'Slovenčina' },
  { value: 'cs', label: 'Čeština' },
  { value: 'de', label: 'Deutsch' },
]

export default function LanguageScreen() {
  const { _ } = useT()
  const router = useRouter()
  const foreground = useThemeColor('foreground') as string
  const { language, setLanguage } = useSettings()

  return (
    <Screen>
      <View className="px-5 pt-2 pb-4 flex-row items-center gap-3">
        <Button variant="ghost" size="sm" isIconOnly onPress={() => router.back()}>
          <ArrowLeft color={foreground} size={20} />
        </Button>
        <Text className="text-foreground text-2xl font-bold">{_('language')}</Text>
      </View>
      <View className="px-5">
        <Surface>
          <RadioGroup
            value={language}
            onValueChange={v => {
              Haptics.selectionAsync()
              setLanguage(v as Language)
            }}
          >
            {LANGUAGES.map((lang, i) => (
              <Fragment key={lang.value}>
                {i > 0 && <Separator className="my-1" />}
                <RadioGroup.Item value={lang.value}>
                  <Label>{lang.label}</Label>
                  <Radio />
                </RadioGroup.Item>
              </Fragment>
            ))}
          </RadioGroup>
        </Surface>
      </View>
    </Screen>
  )
}
