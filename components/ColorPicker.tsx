import { View, TouchableOpacity, StyleSheet } from 'react-native'

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
    <View style={styles.container}>
      {COLORS.map(color => (
        <TouchableOpacity
          key={color}
          style={[styles.dot, { backgroundColor: color }, selected === color && styles.selected]}
          onPress={() => onChange(color)}
        />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 },
  dot: { width: 32, height: 32, borderRadius: 16 },
  selected: { borderWidth: 3, borderColor: '#fff' },
})
