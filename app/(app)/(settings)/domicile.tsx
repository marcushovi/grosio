import { Fragment } from 'react'
import { View, Text } from 'react-native'
import { Screen } from '@/components/Screen'
import { useRouter } from 'expo-router'
import { RadioGroup, Radio, Label, Separator, Surface, useThemeColor } from 'heroui-native'
import { Button } from 'heroui-native/button'
import { ArrowLeft } from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { useT } from '@/lib/t'
import { useSettings } from '@/lib/settingsContext'
import type { Domicile } from '@/lib/settingsContext'

const DOMICILES: { value: Domicile; label: string }[] = [
  { value: 'SK', label: '🇸🇰  Slovenská republika' },
  { value: 'CZ', label: '🇨🇿  Česká republika' },
]

export default function DomicileScreen() {
  const { _ } = useT()
  const router = useRouter()
  const foreground = useThemeColor('foreground') as string
  const { domicile, setDomicile } = useSettings()

  return (
    <Screen>
      <View className="px-5 pt-2 pb-4 flex-row items-center gap-3">
        <Button variant="ghost" size="sm" isIconOnly onPress={() => router.back()}>
          <ArrowLeft color={foreground} size={20} />
        </Button>
        <Text className="text-foreground text-2xl font-bold">{_('domicile')}</Text>
      </View>
      <View className="px-5">
        <Surface>
          <RadioGroup
            value={domicile}
            onValueChange={v => {
              Haptics.selectionAsync()
              setDomicile(v as Domicile)
            }}
          >
            {DOMICILES.map((d, i) => (
              <Fragment key={d.value}>
                {i > 0 && <Separator className="my-1" />}
                <RadioGroup.Item value={d.value}>
                  <Label>{d.label}</Label>
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
