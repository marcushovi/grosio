import { View, Text } from 'react-native'
import { Screen } from '../../../components/Screen'
import { useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { ListGroup, useThemeColor } from 'heroui-native'
import { Button } from 'heroui-native/button'
import { ArrowLeft } from 'lucide-react-native'
import { queryKeys } from '../../../lib/queryKeys'
import { fetchSessionEmail } from '../../../lib/api/auth'
import { useT } from '../../../lib/t'

export default function ProfileScreen() {
  const { _ } = useT()
  const router = useRouter()
  const foreground = useThemeColor('foreground') as string

  const { data: email } = useQuery<string | null>({
    queryKey: queryKeys.session.current(),
    queryFn: fetchSessionEmail,
    staleTime: Infinity, // session email doesn't change while the screen is open
  })

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
              <ListGroup.ItemDescription>{email ?? ''}</ListGroup.ItemDescription>
            </ListGroup.ItemContent>
          </ListGroup.Item>
        </ListGroup>
      </View>
    </Screen>
  )
}
