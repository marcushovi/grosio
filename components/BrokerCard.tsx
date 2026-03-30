import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Broker } from '../types'

interface BrokerCardProps {
  broker: Broker
  totalValue: number
  gainLoss: number
  positionCount: number
  onPress: () => void
  onLongPress: () => void
}

export function BrokerCard({
  broker,
  totalValue,
  gainLoss,
  positionCount,
  onPress,
  onLongPress,
}: BrokerCardProps) {
  const isPositive = gainLoss >= 0

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={[styles.dot, { backgroundColor: broker.color }]} />
        <Text style={styles.name}>{broker.name}</Text>
        <Text style={styles.positions}>{positionCount} pozícií</Text>
      </View>
      <Text style={styles.value}>{totalValue.toFixed(2)}</Text>
      <Text style={[styles.gainLoss, { color: isPositive ? '#2ECC71' : '#FF6B6B' }]}>
        {isPositive ? '+' : ''}
        {gainLoss.toFixed(2)} €
      </Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
  },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  dot: { width: 12, height: 12, borderRadius: 6, marginRight: 8 },
  name: { flex: 1, color: '#fff', fontSize: 18, fontWeight: '600' },
  positions: { color: '#666', fontSize: 14 },
  value: { color: '#fff', fontSize: 28, fontWeight: 'bold', marginBottom: 4 },
  gainLoss: { fontSize: 16, fontWeight: '500' },
})
