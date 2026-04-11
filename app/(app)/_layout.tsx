import { Tabs } from 'expo-router'
import { LayoutDashboard, Briefcase, Settings } from 'lucide-react-native'
import { useThemeColor } from 'heroui-native'
import * as Haptics from 'expo-haptics'
import { useT } from '../../lib/t'

export default function AppLayout() {
  const { _ } = useT()
  const [bg, border, accent, muted] = useThemeColor(['background', 'border', 'accent', 'muted'])

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: bg,
          borderTopColor: border,
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: accent,
        tabBarInactiveTintColor: muted,
        tabBarLabelStyle: { fontSize: 12, fontWeight: '500' },
        sceneStyle: { backgroundColor: bg },
      }}
      screenListeners={{
        tabPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        },
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
        name="settings"
        options={{
          title: _('settings'),
          tabBarIcon: ({ color }) => <Settings color={color} size={22} />,
        }}
      />
      <Tabs.Screen name="broker/[id]" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
      <Tabs.Screen name="language" options={{ href: null }} />
      <Tabs.Screen name="theme" options={{ href: null }} />
      <Tabs.Screen name="display-currency" options={{ href: null }} />
    </Tabs>
  )
}
