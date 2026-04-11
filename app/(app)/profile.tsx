import { View, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { ListGroup } from 'heroui-native'
import { Button } from 'heroui-native/button'
import { useThemeColor } from 'heroui-native'
import { ArrowLeft } from 'lucide-react-native'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useT } from '../../lib/t'

export default function ProfileScreen() {
  const { _ } = useT()
  const router = useRouter()
  const accentFg = useThemeColor('accent-foreground') as string
  const [email, setEmail] = useState('')

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (session?.user) setEmail(session.user.email || '')
      })
      .catch(() => {})
  }, [])

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-5 pt-2 pb-4 flex-row items-center gap-3">
        <Button variant="ghost" size="sm" isIconOnly onPress={() => router.back()}>
          <ArrowLeft color={accentFg} size={20} />
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
    </SafeAreaView>
  )
}
