import { View, Text } from 'react-native'
import { Screen } from '@/components/Screen'
import { useRouter } from 'expo-router'
import { RadioGroup, Radio, Label, Separator, Surface, useThemeColor } from 'heroui-native'
import { Button } from 'heroui-native/button'
import { ArrowLeft } from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { useTranslation } from 'react-i18next'
import { useSettings } from '@/lib/settingsContext'
import type { ThemePreference } from '@/lib/settingsContext'

export default function ThemeScreen() {
  const { t: _ } = useTranslation()
  const router = useRouter()
  const foreground = useThemeColor('foreground') as string
  const { themePreference, setThemePreference } = useSettings()

  return (
    <Screen>
      <View className="px-5 pt-2 pb-4 flex-row items-center gap-3">
        <Button variant="ghost" size="sm" isIconOnly onPress={() => router.back()}>
          <ArrowLeft color={foreground} size={20} />
        </Button>
        <Text className="text-foreground text-2xl font-bold">{_('theme')}</Text>
      </View>
      <View className="px-5">
        <Surface>
          <RadioGroup
            value={themePreference}
            onValueChange={v => {
              Haptics.selectionAsync()
              setThemePreference(v as ThemePreference)
            }}
          >
            <RadioGroup.Item value="light">
              <Label>{_('themeLight')}</Label>
              <Radio />
            </RadioGroup.Item>
            <Separator className="my-1" />
            <RadioGroup.Item value="dark">
              <Label>{_('themeDark')}</Label>
              <Radio />
            </RadioGroup.Item>
            <Separator className="my-1" />
            <RadioGroup.Item value="system">
              <Label>{_('themeSystem')}</Label>
              <Radio />
            </RadioGroup.Item>
          </RadioGroup>
        </Surface>
      </View>
    </Screen>
  )
}
