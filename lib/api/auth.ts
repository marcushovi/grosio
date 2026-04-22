import { supabase } from '@/lib/supabase'

export interface UserCredentials {
  email: string
  password: string
}

/** Sign in with email + password. Throws on auth failure. */
export async function signInWithPassword({ email, password }: UserCredentials): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error(error.message)
}

/** Create a new user account. Throws on failure. */
export async function signUp({ email, password }: UserCredentials): Promise<void> {
  const { error } = await supabase.auth.signUp({ email, password })
  if (error) throw new Error(error.message)
}

/** Sign the current user out. Throws on failure. */
export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut()
  if (error) throw new Error(error.message)
}

/** Return the current session's email, or null if there's no active session. */
export async function fetchSessionEmail(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  return session?.user?.email ?? null
}
