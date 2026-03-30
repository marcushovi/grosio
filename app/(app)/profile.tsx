import { View, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '../../lib/supabase'
import { Button } from 'heroui-native/button'
import { Card } from 'heroui-native/card'
import { useState, useEffect } from 'react'

export default function ProfileScreen() {
  const [email, setEmail] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setEmail(user.email || '')
    })
  }, [])

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-5 pt-4 pb-2">
        <Text className="text-foreground text-3xl font-bold">Profil</Text>
      </View>
      <View className="px-5 mt-4">
        <Card className="bg-surface p-5 mb-4">
          <Text className="text-muted text-sm mb-1">Email</Text>
          <Text className="text-foreground text-base">{email}</Text>
        </Card>
        <Button
          variant="danger"
          size="lg"
          onPress={() => supabase.auth.signOut()}
          className="w-full"
        >
          <Button.Label>Odhlásiť sa</Button.Label>
        </Button>
      </View>
    </SafeAreaView>
  )
}
