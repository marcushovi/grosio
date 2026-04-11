import AsyncStorage from '@react-native-async-storage/async-storage'

const DEFAULT_TTL = 15 * 60 * 1000

export async function getCached<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    const ttl = parsed.ttl ?? DEFAULT_TTL
    if (Date.now() - parsed.timestamp > ttl) return null
    return parsed.data as T
  } catch {
    return null
  }
}

export async function setCache(key: string, data: unknown, ttl?: number): Promise<void> {
  try {
    await AsyncStorage.setItem(
      key,
      JSON.stringify({ data, timestamp: Date.now(), ...(ttl != null && { ttl }) })
    )
  } catch {
    // silently ignore storage errors
  }
}
