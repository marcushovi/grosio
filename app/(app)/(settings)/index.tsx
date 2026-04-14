import { Text, ScrollView, Alert, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ListGroup, Separator, useThemeColor } from 'heroui-native'
import { Button } from 'heroui-native/button'
import { useRouter } from 'expo-router'
import { useCallback } from 'react'
import { User, Globe, Palette, Coins, ShieldCheck } from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { useMutation } from '@tanstack/react-query'
import { signOut } from '../../../lib/api/auth'
import { useT } from '../../../lib/t'
import { useSettings } from '../../../lib/settingsContext'
import { currencySymbol } from '../../../lib/currency'

const LANGUAGE_LABELS: Record<string, string> = {
  en: 'English',
  sk: 'Slovenčina',
  cs: 'Čeština',
  de: 'Deutsch',
}

export default function SettingsScreen() {
  const { _ } = useT()
  const router = useRouter()
  const foreground = useThemeColor('foreground') as string
  const { language, themePreference, currency, domicile } = useSettings()

  const logout = useMutation({
    mutationFn: signOut,
    onError: () => Alert.alert(_('error'), _('logOutError')),
  })
  const handleLogout = useCallback(() => logout.mutate(), [logout])

  const navigate = (path: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    router.push(path as never)
  }

  const themeLabel =
    themePreference === 'light'
      ? _('themeLight')
      : themePreference === 'dark'
        ? _('themeDark')
        : _('themeSystem')

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text className="text-foreground text-3xl font-bold mb-6">{_('settings')}</Text>

        {/* Account */}
        <Text className="text-muted text-xs mb-2 px-1">{_('profile')}</Text>
        <ListGroup className="mb-6">
          <Pressable onPress={() => navigate('/(app)/(settings)/profile')}>
            <ListGroup.Item disabled>
              <ListGroup.ItemPrefix>
                <User size={20} color={foreground} />
              </ListGroup.ItemPrefix>
              <ListGroup.ItemContent>
                <ListGroup.ItemTitle>{_('profile')}</ListGroup.ItemTitle>
              </ListGroup.ItemContent>
              <ListGroup.ItemSuffix />
            </ListGroup.Item>
          </Pressable>
        </ListGroup>

        {/* Preferences */}
        <Text className="text-muted text-xs mb-2 px-1">{_('settings')}</Text>
        <ListGroup className="mb-6">
          <Pressable onPress={() => navigate('/(app)/(settings)/language')}>
            <ListGroup.Item disabled>
              <ListGroup.ItemPrefix>
                <Globe size={20} color={foreground} />
              </ListGroup.ItemPrefix>
              <ListGroup.ItemContent>
                <ListGroup.ItemTitle>{_('language')}</ListGroup.ItemTitle>
                <ListGroup.ItemDescription>{LANGUAGE_LABELS[language]}</ListGroup.ItemDescription>
              </ListGroup.ItemContent>
              <ListGroup.ItemSuffix />
            </ListGroup.Item>
          </Pressable>

          <Separator className="mx-4" />

          <Pressable onPress={() => navigate('/(app)/(settings)/theme')}>
            <ListGroup.Item disabled>
              <ListGroup.ItemPrefix>
                <Palette size={20} color={foreground} />
              </ListGroup.ItemPrefix>
              <ListGroup.ItemContent>
                <ListGroup.ItemTitle>{_('theme')}</ListGroup.ItemTitle>
                <ListGroup.ItemDescription>{themeLabel}</ListGroup.ItemDescription>
              </ListGroup.ItemContent>
              <ListGroup.ItemSuffix />
            </ListGroup.Item>
          </Pressable>

          <Separator className="mx-4" />

          <Pressable onPress={() => navigate('/(app)/(settings)/display-currency')}>
            <ListGroup.Item disabled>
              <ListGroup.ItemPrefix>
                <Coins size={20} color={foreground} />
              </ListGroup.ItemPrefix>
              <ListGroup.ItemContent>
                <ListGroup.ItemTitle>{_('displayCurrency')}</ListGroup.ItemTitle>
                <ListGroup.ItemDescription>
                  {currencySymbol(currency)} {currency}
                </ListGroup.ItemDescription>
              </ListGroup.ItemContent>
              <ListGroup.ItemSuffix />
            </ListGroup.Item>
          </Pressable>

          <Separator className="mx-4" />

          <Pressable onPress={() => navigate('/(app)/(settings)/domicile')}>
            <ListGroup.Item disabled>
              <ListGroup.ItemPrefix>
                <ShieldCheck size={20} color={foreground} />
              </ListGroup.ItemPrefix>
              <ListGroup.ItemContent>
                <ListGroup.ItemTitle>{_('domicile')}</ListGroup.ItemTitle>
                <ListGroup.ItemDescription>
                  {domicile === 'SK' ? _('domicileSK') : _('domicileCZ')}
                </ListGroup.ItemDescription>
              </ListGroup.ItemContent>
              <ListGroup.ItemSuffix />
            </ListGroup.Item>
          </Pressable>
        </ListGroup>

        <Button variant="danger" size="lg" onPress={handleLogout} className="w-full">
          <Button.Label>{_('logOut')}</Button.Label>
        </Button>
      </ScrollView>
    </SafeAreaView>
  )
}
