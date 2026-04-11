import { View, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { ListGroup, PressableFeedback, Separator, useThemeColor } from 'heroui-native'
import { Button } from 'heroui-native/button'
import { ArrowLeft, Check } from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { useT } from '../../lib/t'
import { useSettings } from '../../lib/settingsContext'
import type { ThemePreference } from '../../lib/settingsContext'

export default function ThemeScreen() {
  const { _ } = useT()
  const router = useRouter()
  const accent = useThemeColor('accent') as string
  const accentFg = useThemeColor('accent-foreground') as string
  const { themePreference, setThemePreference } = useSettings()

  const options: { value: ThemePreference; label: string }[] = [
    { value: 'light', label: _('themeLight') },
    { value: 'dark', label: _('themeDark') },
    { value: 'system', label: _('themeSystem') },
  ]

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-5 pt-2 pb-4 flex-row items-center gap-3">
        <Button variant="ghost" size="sm" isIconOnly onPress={() => router.back()}>
          <ArrowLeft color={accentFg} size={20} />
        </Button>
        <Text className="text-foreground text-2xl font-bold">{_('theme')}</Text>
      </View>
      <View className="px-5">
        <ListGroup>
          {options.map((opt, i) => (
            <View key={opt.value}>
              {i > 0 && <Separator className="mx-4" />}
              <PressableFeedback
                animation={false}
                onPress={() => {
                  Haptics.selectionAsync()
                  setThemePreference(opt.value)
                }}
              >
                <PressableFeedback.Highlight />
                <ListGroup.Item disabled>
                  <ListGroup.ItemContent>
                    <ListGroup.ItemTitle>{opt.label}</ListGroup.ItemTitle>
                  </ListGroup.ItemContent>
                  <ListGroup.ItemSuffix>
                    {themePreference === opt.value ? <Check size={18} color={accent} /> : null}
                  </ListGroup.ItemSuffix>
                </ListGroup.Item>
              </PressableFeedback>
            </View>
          ))}
        </ListGroup>
      </View>
    </SafeAreaView>
  )
}
