import { useState, useRef, useCallback } from 'react'
import { View, Text, Pressable, Modal } from 'react-native'
import { useThemeColor } from 'heroui-native'
import * as Haptics from 'expo-haptics'
import { currencySymbol } from '@/lib/format'
import { useSettings } from '@/lib/settingsContext'
import { CURRENCIES } from '@/lib/constants'
import type { DisplayCurrency } from '@/lib/currency'
import { useTranslation } from 'react-i18next'

const MENU_OFFSET_Y = 4
const MENU_RIGHT_INSET = 20

export function CurrencyPicker() {
  const { t: _ } = useTranslation()
  const { currency, setCurrency } = useSettings()
  const [accent, surface, foreground] = useThemeColor(['accent', 'surface', 'foreground'])
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 })
  const btnRef = useRef<View>(null)

  const openMenu = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    btnRef.current?.measureInWindow((x, y, width, height) => {
      setMenuPos({ top: y + height + MENU_OFFSET_Y, right: MENU_RIGHT_INSET })
      setMenuOpen(true)
    })
  }, [])

  const select = useCallback(
    (c: DisplayCurrency) => {
      Haptics.selectionAsync()
      setCurrency(c)
      setMenuOpen(false)
    },
    [setCurrency]
  )

  return (
    <>
      <View ref={btnRef} collapsable={false}>
        <Pressable
          onPress={openMenu}
          className="bg-surface rounded-xl px-3 py-2"
          accessibilityRole="button"
          accessibilityLabel={_('displayCurrency')}
        >
          <Text className="text-accent text-base font-semibold">{currencySymbol(currency)}</Text>
        </Pressable>
      </View>

      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setMenuOpen(false)}
      >
        <Pressable className="flex-1" onPress={() => setMenuOpen(false)}>
          <View
            className="absolute min-w-40 rounded-xl py-1 shadow-md"
            style={{
              top: menuPos.top,
              right: menuPos.right,
              backgroundColor: surface,
            }}
          >
            {CURRENCIES.map(c => (
              <Pressable
                key={c.value}
                onPress={() => select(c.value)}
                className="flex-row items-center justify-between px-4 py-3"
              >
                <Text
                  className={`text-base ${c.value === currency ? 'font-semibold' : 'font-normal'}`}
                  style={{
                    color: c.value === currency ? accent : foreground,
                  }}
                >
                  {c.label}
                </Text>
                {c.value === currency && (
                  <Text className="text-sm" style={{ color: accent }}>
                    ✓
                  </Text>
                )}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  )
}
