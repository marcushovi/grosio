import { View, Pressable } from 'react-native'
import * as Haptics from 'expo-haptics'

export const COLORS = [
  '#006fee',
  '#17c964',
  '#f31260',
  '#f5a524',
  '#7828c8',
  '#00b8d9',
  '#ff6900',
  '#9e9e9e',
]

interface ColorPickerProps {
  selected: string
  onChange: (color: string) => void
}

export function ColorPicker({ selected, onChange }: ColorPickerProps) {
  return (
    <View className="flex-row flex-wrap gap-3 mt-2">
      {COLORS.map(color => (
        <Pressable
          key={color}
          onPress={() => {
            Haptics.selectionAsync()
            onChange(color)
          }}
          className={`w-8 h-8 rounded-full ${selected === color ? 'border-2 border-foreground' : ''}`}
          style={{ backgroundColor: color }}
        />
      ))}
    </View>
  )
}
