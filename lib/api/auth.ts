import { supabase } from '@/lib/supabase'

export interface UserCredentials {
  email: string
  password: string
}

export async function signInWithPassword({ email, password }: UserCredentials): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error(error.message)
}

export async function signUp({ email, password }: UserCredentials): Promise<void> {
  const { error } = await supabase.auth.signUp({ email, password })
  if (error) throw new Error(error.message)
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut()
  if (error) throw new Error(error.message)
}

export async function fetchSessionEmail(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  return session?.user?.email ?? null
}
