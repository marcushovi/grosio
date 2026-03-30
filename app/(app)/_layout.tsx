import { Tabs } from 'expo-router'
export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: '#0a0a0a', borderTopColor: '#1a1a1a' },
        tabBarActiveTintColor: '#4ECDC4',
        tabBarInactiveTintColor: '#666',
      }}
    >
      <Tabs.Screen name="dashboard" options={{ title: 'Prehlad', tabBarIcon: () => null }} />
      <Tabs.Screen name="brokers" options={{ title: 'Brokeri', tabBarIcon: () => null }} />
      <Tabs.Screen name="profile" options={{ title: 'Profil', tabBarIcon: () => null }} />
    </Tabs>
  )
}
