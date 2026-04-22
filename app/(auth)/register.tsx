import { useCallback, useState } from 'react'
import { Text, Alert, KeyboardAvoidingView, Platform } from 'react-native'
import { Link, useRouter } from 'expo-router'
import { useMutation } from '@tanstack/react-query'
import { Button } from 'heroui-native/button'
import { Input } from 'heroui-native/input'
import { signUp } from '@/lib/api/auth'
import { useT } from '@/lib/t'
import { APP_NAME } from '@/lib/constants'

export default function RegisterScreen() {
  const { _ } = useT()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const register = useMutation({
    mutationFn: signUp,
    onSuccess: () => {
      Alert.alert(_('registerSuccess'), _('registerSuccessMsg'), [
        { text: _('ok'), onPress: () => router.replace('/(auth)/login') },
      ])
    },
    onError: (err: Error) => Alert.alert(_('error'), err.message || _('unexpectedError')),
  })

  const handleRegister = useCallback(() => {
    if (!email || !password) return Alert.alert(_('error'), _('fillEmailPassword'))
    register.mutate({ email, password })
  }, [email, password, register, _])

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
        isDisabled={register.isPending}
        className="mb-4"
      >
        <Button.Label>{register.isPending ? _('registering') : _('register')}</Button.Label>
      </Button>
      <Link href="/(auth)/login" className="text-accent text-center text-sm">
        {_('haveAccount')}
      </Link>
    </KeyboardAvoidingView>
  )
}
