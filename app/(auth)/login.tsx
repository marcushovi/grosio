import { useCallback, useState } from 'react'
import { Text, Alert, KeyboardAvoidingView, Platform } from 'react-native'
import { Link } from 'expo-router'
import { useMutation } from '@tanstack/react-query'
import { Button } from 'heroui-native/button'
import { Input } from 'heroui-native/input'
import { useSession } from '@/lib/sessionContext'
import { useT } from '@/lib/t'
import { APP_NAME } from '@/lib/constants'

export default function LoginScreen() {
  const { _ } = useT()
  const { signIn } = useSession()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const login = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      signIn(email, password),
    onError: (err: Error) => Alert.alert(_('error'), err.message || _('unexpectedError')),
  })

  const handleLogin = useCallback(() => {
    if (!email || !password) return Alert.alert(_('error'), _('fillEmailPassword'))
    login.mutate({ email, password })
  }, [email, password, login, _])

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background justify-center px-6"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text className="text-accent text-5xl font-bold text-center mb-2">{APP_NAME}</Text>
      <Text className="text-muted text-base text-center mb-10">{_('appTagline')}</Text>
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
        onPress={handleLogin}
        isDisabled={login.isPending}
        className="mb-4"
      >
        <Button.Label>{login.isPending ? _('loggingIn') : _('login')}</Button.Label>
      </Button>
      <Link href="/(auth)/register" className="text-accent text-center text-sm">
        {_('noAccount')}
      </Link>
    </KeyboardAvoidingView>
  )
}
