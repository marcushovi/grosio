import { View, Text, StyleSheet } from 'react-native'
export default function BrokersScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Brokeri (WIP)</Text>
    </View>
  )
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: { color: '#fff', fontSize: 18 },
})
