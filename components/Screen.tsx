import type { ReactNode } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useThemeColor } from 'heroui-native'

interface ScreenProps {
  children: ReactNode
  /** Extra Tailwind classes merged onto the root (e.g. `items-center justify-center`). */
  className?: string
}

/**
 * Top-level screen wrapper.
 *
 * `SafeAreaView` from `react-native-safe-area-context` is *not* patched by
 * Uniwind's Metro resolver (Uniwind only redirects the deprecated
 * `react-native` SafeAreaView), so `bg-background` on it is ignored — the
 * safe-area region falls back to the native window colour and reads as a
 * white band in dark mode. Routing the resolved theme background through
 * an inline `style` sidesteps that and keeps every screen theme-correct.
 */
export function Screen({ children, className }: ScreenProps) {
  const bg = useThemeColor('background') as string
  return (
    <SafeAreaView className={className} style={{ flex: 1, backgroundColor: bg }}>
      {children}
    </SafeAreaView>
  )
}
