import 'react-native-url-polyfill/auto'
import { createClient } from '@supabase/supabase-js'
import * as SecureStore from 'expo-secure-store'

const url = process.env.EXPO_PUBLIC_SUPABASE_URL
const key = process.env.EXPO_PUBLIC_SUPABASE_KEY

if (!url || !key) {
  throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_KEY in .env')
}

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
}

export const supabase = createClient(url, key, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

/** Get authenticated user ID from cached session. Returns null if not authenticated. */
export async function getAuthUserId(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  return session?.user?.id ?? null
}
