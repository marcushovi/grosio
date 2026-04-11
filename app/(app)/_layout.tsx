import { Tabs } from 'expo-router'
import { LayoutDashboard, Briefcase, Settings } from 'lucide-react-native'
import { useThemeColor } from 'heroui-native'
import * as Haptics from 'expo-haptics'
import { useT } from '../../lib/t'
import { useSettings } from '../../lib/settingsContext'

export default function AppLayout() {
  const { _ } = useT()
  const { resolvedTheme } = useSettings()
  const [bg, border, accent, muted] = useThemeColor(['background', 'border', 'accent', 'muted'])

  // Native scene bg must use a static value keyed on theme, not a CSS variable
  const sceneBg = resolvedTheme === 'dark' ? '#0a0a0a' : '#f5f5f5'

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
        sceneStyle: { backgroundColor: sceneBg },
      }}
      screenListeners={{
        tabPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        },
      }}
    >
      <Tabs.Screen
        name="(dashboard)"
        options={{
          title: _('dashboard'),
          tabBarIcon: ({ color }) => <LayoutDashboard color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="(brokers)"
        options={{
          title: _('brokers'),
          tabBarIcon: ({ color }) => <Briefcase color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="(settings)"
        options={{
          title: _('settings'),
          tabBarIcon: ({ color }) => <Settings color={color} size={22} />,
        }}
      />
    </Tabs>
  )
}
