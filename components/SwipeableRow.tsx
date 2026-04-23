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
}

const ACTION_WIDTH = 76

// Swipe-to-reveal row (iOS Mail pattern). No full-swipe-dismiss — button tap
// is always required. Each button closes the swipe before firing.
export function SwipeableRow({ children, actions }: SwipeableRowProps) {
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
              action.onPress()
            }}
          />
        ))}
      </View>
    )
  }

  return (
    <ReanimatedSwipeable
      ref={swipeRef}
      friction={2}
      rightThreshold={ACTION_WIDTH / 2}
      overshootRight={false}
      renderRightActions={renderRightActions}
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

// Staggered slide-in so buttons reveal from the right edge as the row opens.
function SwipeAction({ action, index, actionCount, translation, onPress }: SwipeActionProps) {
  const Icon = action.icon
  const style = useAnimatedStyle(() => {
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
