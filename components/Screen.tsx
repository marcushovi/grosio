import type { ReactNode } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useThemeColor } from 'heroui-native'

interface ScreenProps {
  children: ReactNode
  className?: string
}

// SafeAreaView from `react-native-safe-area-context` is not patched by
// Uniwind's Metro resolver, so `bg-background` on it is ignored. Route the
// resolved background through inline style instead.
export function Screen({ children, className }: ScreenProps) {
  const bg = useThemeColor('background') as string
  return (
    <SafeAreaView className={`flex-1 ${className ?? ''}`} style={{ backgroundColor: bg }}>
      {children}
    </SafeAreaView>
  )
}
