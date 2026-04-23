import { Redirect } from 'expo-router'
import { useSession } from '@/lib/sessionContext'

// Entry route — redirects into the active group. Stack.Protected only mounts
// one of `(app)` / `(auth)`, and `(auth)` has no index.
export default function Index() {
  const { session, isLoading } = useSession()
  if (isLoading) return null
  return <Redirect href={session ? '/(app)/(dashboard)' : '/(auth)/login'} />
}
