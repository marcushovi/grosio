import { Redirect } from 'expo-router'
import { useSession } from '@/lib/sessionContext'

// Entry route picks the right initial destination so the user lands inside
// the active group (Stack.Protected only mounts one of `(app)` / `(auth)`,
// and `(auth)` has no index — so blind redirect to `(app)` would blank out
// while signed out).
export default function Index() {
  const { session, isLoading } = useSession()
  if (isLoading) return null
  return <Redirect href={session ? '/(app)/(dashboard)' : '/(auth)/login'} />
}
