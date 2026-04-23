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
import { DOMICILES } from '@/lib/constants'
import type { Domicile } from '@/lib/settingsContext'

export default function DomicileScreen() {
  const { t: _ } = useTranslation()
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
            {DOMICILES.map((d, i) => {
              const label = d.value === 'SK' ? _('domicileSK') : _('domicileCZ')
              const helper = d.value === 'SK' ? _('domicileHelperSK') : _('domicileHelperCZ')
              return (
                <Fragment key={d.value}>
                  {i > 0 && <Separator className="my-1" />}
                  <RadioGroup.Item value={d.value}>
                    <View className="flex-1">
                      <Label>{`${d.flag}  ${label}`}</Label>
                      <Text className="text-muted text-xs mt-0.5">{helper}</Text>
                    </View>
                    <Radio />
                  </RadioGroup.Item>
                </Fragment>
              )
            })}
          </RadioGroup>
        </Surface>
      </View>
    </Screen>
  )
}
