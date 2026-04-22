import { Fragment } from 'react'
import { View, Text } from 'react-native'
import { Screen } from '@/components/Screen'
import { useRouter } from 'expo-router'
import { RadioGroup, Radio, Label, Separator, Surface, useThemeColor } from 'heroui-native'
import { Button } from 'heroui-native/button'
import { ArrowLeft } from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { useTranslation } from 'react-i18next'
import { useSettings } from '@/lib/settingsContext'
import { CURRENCIES } from '@/lib/constants'
import type { DisplayCurrency } from '@/lib/settingsContext'

export default function DisplayCurrencyScreen() {
  const { t: _ } = useTranslation()
  const router = useRouter()
  const foreground = useThemeColor('foreground') as string
  const { currency, setCurrency } = useSettings()

  return (
    <Screen>
      <View className="px-5 pt-2 pb-4 flex-row items-center gap-3">
        <Button variant="ghost" size="sm" isIconOnly onPress={() => router.back()}>
          <ArrowLeft color={foreground} size={20} />
        </Button>
        <Text className="text-foreground text-2xl font-bold">{_('displayCurrency')}</Text>
      </View>
      <View className="px-5">
        <Surface>
          <RadioGroup
            value={currency}
            onValueChange={v => {
              Haptics.selectionAsync()
              setCurrency(v as DisplayCurrency)
            }}
          >
            {CURRENCIES.map((c, i) => (
              <Fragment key={c.value}>
                {i > 0 && <Separator className="my-1" />}
                <RadioGroup.Item value={c.value}>
                  <Label>{c.label}</Label>
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
