import type { ReactNode } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useThemeColor } from 'heroui-native'

interface ScreenProps {
  children: ReactNode
  className?: string
}

// SafeAreaView from `react-native-safe-area-context` is not patched by
// Uniwind's Metro resolver, so className (including `flex-1` and
// `bg-background`) is ignored. Route both through inline style.
export function Screen({ children, className }: ScreenProps) {
  const bg = useThemeColor('background') as string
  return (
    <SafeAreaView className={className} style={{ flex: 1, backgroundColor: bg }}>
      {children}
    </SafeAreaView>
  )
}
