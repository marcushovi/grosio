import { Stack } from 'expo-router'

// Shared header-less Stack reused by every route group under `(app)`.
export default function GroupStackLayout() {
  return <Stack screenOptions={{ headerShown: false }} />
}
