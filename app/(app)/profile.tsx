import { View, Text, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '../../lib/supabase'
import { Button } from 'heroui-native/button'
import { Card } from 'heroui-native/card'
import { useState, useEffect, useCallback } from 'react'
import { useT } from '../../lib/t'

export default function ProfileScreen() {
  const { _ } = useT()
  const [email, setEmail] = useState('')

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (session?.user) setEmail(session.user.email || '')
      })
      .catch(() => {})
  }, [])

  const handleLogout = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) Alert.alert(_('error'), _('logOutError'))
    } catch {
      Alert.alert(_('error'), _('logOutError'))
    }
  }, [_])

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-5 pt-4 pb-2">
        <Text className="text-foreground text-3xl font-bold">{_('profile')}</Text>
      </View>
      <View className="px-5 mt-4">
        <Card className="bg-surface p-5 mb-4">
          <Text className="text-muted text-sm mb-1">{_('email')}</Text>
          <Text className="text-foreground text-base">{email}</Text>
        </Card>
        <Button variant="danger" size="lg" onPress={handleLogout} className="w-full">
          <Button.Label>{_('logOut')}</Button.Label>
        </Button>
      </View>
    </SafeAreaView>
  )
}
