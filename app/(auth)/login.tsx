import { useState } from 'react'
import { Text, Alert, KeyboardAvoidingView, Platform } from 'react-native'
import { supabase } from '../../lib/supabase'
import { Link } from 'expo-router'
import { Button } from 'heroui-native/button'
import { Input } from 'heroui-native/input'
import { useT } from '../../lib/t'

export default function LoginScreen() {
  const { _ } = useT()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    if (!email || !password) return Alert.alert(_('error'), _('fillEmailPassword'))
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) Alert.alert(_('error'), error.message)
    setLoading(false)
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background justify-center px-6"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text className="text-accent text-5xl font-bold text-center mb-2">Grosio</Text>
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
        isDisabled={loading}
        className="mb-4"
      >
        <Button.Label>{loading ? _('loggingIn') : _('login')}</Button.Label>
      </Button>
      <Link href="/(auth)/register" className="text-accent text-center text-sm">
        {_('noAccount')}
      </Link>
    </KeyboardAvoidingView>
  )
}
