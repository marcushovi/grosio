import { Tabs } from 'expo-router'
import { LayoutDashboard, Briefcase, User, Settings } from 'lucide-react-native'
import { useT } from '../../lib/t'
import { useSettings } from '../../lib/settingsContext'

export default function AppLayout() {
  const { _ } = useT()
  const { resolvedTheme } = useSettings()
  const isDark = resolvedTheme === 'dark'

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: isDark ? '#18181b' : '#ffffff',
          borderTopColor: isDark ? '#27272a' : '#e4e4e7',
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: '#006fee',
        tabBarInactiveTintColor: isDark ? '#a1a1aa' : '#71717a',
        tabBarLabelStyle: { fontSize: 12, fontWeight: '500' },
        sceneStyle: { backgroundColor: isDark ? '#0a0a0a' : '#f5f5f5' },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: _('dashboard'),
          tabBarIcon: ({ color }) => <LayoutDashboard color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="brokers"
        options={{
          title: _('brokers'),
          tabBarIcon: ({ color }) => <Briefcase color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: _('profile'),
          tabBarIcon: ({ color }) => <User color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: _('settings'),
          tabBarIcon: ({ color }) => <Settings color={color} size={22} />,
        }}
      />
      <Tabs.Screen name="broker/[id]" options={{ href: null }} />
    </Tabs>
  )
}
