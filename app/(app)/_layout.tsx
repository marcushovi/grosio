import { Tabs } from 'expo-router'
import { LayoutDashboard, Briefcase, User } from 'lucide-react-native'

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0a0a0a',
          borderTopColor: '#1a1a1a',
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: '#4ECDC4',
        tabBarInactiveTintColor: '#666666',
        tabBarLabelStyle: { fontSize: 12, fontWeight: '500' },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Prehľad',
          tabBarIcon: ({ color }) => <LayoutDashboard color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="brokers"
        options={{
          title: 'Brokeri',
          tabBarIcon: ({ color }) => <Briefcase color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color }) => <User color={color} size={22} />,
        }}
      />
    </Tabs>
  )
}
