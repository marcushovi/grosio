import AsyncStorage from '@react-native-async-storage/async-storage'

const TTL = 15 * 60 * 1000

export async function getCached<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key)
    if (!raw) return null
    const { data, timestamp } = JSON.parse(raw)
    if (Date.now() - timestamp > TTL) return null
    return data as T
  } catch {
    return null
  }
}

export async function setCache(key: string, data: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }))
  } catch {
    // silently ignore storage errors
  }
}
