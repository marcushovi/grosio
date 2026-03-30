import { View, Pressable } from 'react-native'

const COLORS = [
  '#4ECDC4',
  '#FF6B6B',
  '#45B7D1',
  '#96CEB4',
  '#FFEAA7',
  '#DDA0DD',
  '#98D8C8',
  '#F7DC6F',
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
          className={`w-8 h-8 rounded-full ${selected === color ? 'border-3 border-foreground' : ''}`}
          style={{ backgroundColor: color }}
          onPress={() => onChange(color)}
        />
      ))}
    </View>
  )
}
