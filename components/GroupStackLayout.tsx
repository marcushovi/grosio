import { Stack } from 'expo-router'

/** Shared layout for every route group under `(app)`. Each group just needs a
 *  plain header-less Stack, so factor the four copies into one component. */
export default function GroupStackLayout() {
  return <Stack screenOptions={{ headerShown: false }} />
}
