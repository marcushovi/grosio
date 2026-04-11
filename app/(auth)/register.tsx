import { useState, useCallback } from 'react'
import { Text, Alert, KeyboardAvoidingView, Platform } from 'react-native'
import { supabase } from '../../lib/supabase'
import { Link, useRouter } from 'expo-router'
import { Button } from 'heroui-native/button'
import { Input } from 'heroui-native/input'
import { useT } from '../../lib/t'
import { APP_NAME } from '../../lib/constants'

export default function RegisterScreen() {
  const { _ } = useT()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleRegister = useCallback(async () => {
    if (!email || !password) return Alert.alert(_('error'), _('fillEmailPassword'))
    setLoading(true)
    try {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) {
        Alert.alert(_('error'), error.message)
      } else {
        Alert.alert(_('registerSuccess'), _('registerSuccessMsg'), [
          { text: _('ok'), onPress: () => router.replace('/(auth)/login') },
        ])
      }
    } catch (e) {
      Alert.alert(_('error'), e instanceof Error ? e.message : _('unexpectedError'))
    } finally {
      setLoading(false)
    }
  }, [email, password, _, router])

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background justify-center px-6"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text className="text-accent text-5xl font-bold text-center mb-2">{APP_NAME}</Text>
      <Text className="text-muted text-base text-center mb-10">{_('createAccount')}</Text>
      <Input
        className="mb-3"
        placeholder={_('email')}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <Input
        className="mb-6"
        placeholder={_('password')}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <Button
        variant="primary"
        size="lg"
        onPress={handleRegister}
        isDisabled={loading}
        className="mb-4"
      >
        <Button.Label>{loading ? _('registering') : _('register')}</Button.Label>
      </Button>
      <Link href="/(auth)/login" className="text-accent text-center text-sm">
        {_('haveAccount')}
      </Link>
    </KeyboardAvoidingView>
  )
}
