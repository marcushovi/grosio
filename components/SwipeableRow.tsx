import { useRef, type ReactNode } from 'react'
import { View, Text, Pressable } from 'react-native'
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable'
import Animated, { useAnimatedStyle, interpolate, type SharedValue } from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import type { LucideIcon } from 'lucide-react-native'

export interface SwipeableRowAction {
  label: string
  icon: LucideIcon
  backgroundColor: string
  onPress: () => void
}

interface SwipeableRowProps {
  children: ReactNode
  actions: SwipeableRowAction[]
  onSwipeableOpen?: () => void
  enabled?: boolean
}

// iOS-native feel: one action comfortably fits a 28px icon + label stack.
const ACTION_WIDTH = 76

/**
 * Swipe-to-reveal row with 1–2 right-side actions (iOS Mail / Messages
 * pattern). Intentionally does NOT implement full-swipe-to-dismiss — a tap on
 * the revealed button is required, so destructive actions can't fire by
 * accident. Each button closes the swipe first, then runs the handler — this
 * keeps the row in a clean closed state by the time any dialog appears.
 */
export function SwipeableRow({
  children,
  actions,
  onSwipeableOpen,
  enabled = true,
}: SwipeableRowProps) {
  const swipeRef = useRef<SwipeableMethods>(null)

  const renderRightActions = (_progress: SharedValue<number>, translation: SharedValue<number>) => {
    const totalWidth = ACTION_WIDTH * actions.length
    return (
      <View className="flex-row" style={{ width: totalWidth }}>
        {actions.map((action, i) => (
          <SwipeAction
            key={`${action.label}-${i}`}
            action={action}
            index={i}
            actionCount={actions.length}
            translation={translation}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
              swipeRef.current?.close()
              // Close first so the dialog opens against a clean row state.
              action.onPress()
            }}
          />
        ))}
      </View>
    )
  }

  if (!enabled) return <>{children}</>

  return (
    <ReanimatedSwipeable
      ref={swipeRef}
      friction={2}
      rightThreshold={ACTION_WIDTH / 2}
      overshootRight={false}
      renderRightActions={renderRightActions}
      onSwipeableOpen={onSwipeableOpen}
    >
      {children}
    </ReanimatedSwipeable>
  )
}

interface SwipeActionProps {
  action: SwipeableRowAction
  index: number
  actionCount: number
  translation: SharedValue<number>
  onPress: () => void
}

/** Per-button slide-in: buttons animate from the right edge as the row
 *  opens, giving the iOS Mail "staggered reveal" look. */
function SwipeAction({ action, index, actionCount, translation, onPress }: SwipeActionProps) {
  const Icon = action.icon
  const style = useAnimatedStyle(() => {
    // translation is negative when swiping left; -totalWidth means fully open.
    const totalWidth = ACTION_WIDTH * actionCount
    const offset = ACTION_WIDTH * (actionCount - 1 - index)
    return {
      transform: [
        {
          translateX: interpolate(translation.value, [-totalWidth, 0], [0, offset], 'clamp'),
        },
      ],
    }
  })

  return (
    <Animated.View style={[{ width: ACTION_WIDTH }, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={action.label}
        onPress={onPress}
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: action.backgroundColor }}
      >
        <Icon size={22} color="#ffffff" />
        <Text className="text-white text-xs font-semibold mt-1">{action.label}</Text>
      </Pressable>
    </Animated.View>
  )
}
