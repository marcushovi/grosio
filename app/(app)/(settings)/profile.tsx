import { View, Text } from 'react-native'
import { Screen } from '@/components/Screen'
import { useRouter } from 'expo-router'
import { ListGroup, useThemeColor } from 'heroui-native'
import { Button } from 'heroui-native/button'
import { ArrowLeft } from 'lucide-react-native'
import { useSession } from '@/lib/sessionContext'
import { useTranslation } from 'react-i18next'

export default function ProfileScreen() {
  const { t: _ } = useTranslation()
  const router = useRouter()
  const foreground = useThemeColor('foreground') as string
  const { session } = useSession()
  const email = session?.user?.email ?? ''

  return (
    <Screen>
      <View className="px-5 pt-2 pb-4 flex-row items-center gap-3">
        <Button variant="ghost" size="sm" isIconOnly onPress={() => router.back()}>
          <ArrowLeft color={foreground} size={20} />
        </Button>
        <Text className="text-foreground text-2xl font-bold">{_('profile')}</Text>
      </View>
      <View className="px-5">
        <ListGroup>
          <ListGroup.Item disabled>
            <ListGroup.ItemContent>
              <ListGroup.ItemTitle>{_('email')}</ListGroup.ItemTitle>
              <ListGroup.ItemDescription>{email}</ListGroup.ItemDescription>
            </ListGroup.ItemContent>
          </ListGroup.Item>
        </ListGroup>
      </View>
    </Screen>
  )
}
