import { useState } from 'react'
import { Text, Alert, KeyboardAvoidingView, Platform } from 'react-native'
import { supabase } from '../../lib/supabase'
import { Link } from 'expo-router'
import { Button } from 'heroui-native/button'
import { Input } from 'heroui-native/input'

export default function RegisterScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleRegister = async () => {
    if (!email || !password) return Alert.alert('Chyba', 'Vyplňte email a heslo')
    setLoading(true)
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) Alert.alert('Chyba', error.message)
    setLoading(false)
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background justify-center px-6"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text className="text-accent text-5xl font-bold text-center mb-2">Grosio</Text>
      <Text className="text-muted text-base text-center mb-10">Vytvor si účet</Text>
      <Input
        className="mb-3"
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <Input
        className="mb-6"
        placeholder="Heslo"
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
        <Button.Label>{loading ? 'Vytvárám účet...' : 'Vytvoriť účet'}</Button.Label>
      </Button>
      <Link href="/(auth)/login" className="text-accent text-center text-sm">
        Máš účet? Prihlás sa
      </Link>
    </KeyboardAvoidingView>
  )
}
