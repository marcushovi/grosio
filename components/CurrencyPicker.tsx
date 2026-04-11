import { useState, useRef, useCallback } from 'react'
import { View, Text, Pressable, Modal } from 'react-native'
import { useThemeColor } from 'heroui-native'
import { currencySymbol } from '../lib/currency'
import { useSettings } from '../lib/settingsContext'
import { CURRENCIES } from '../lib/constants'
import type { DisplayCurrency } from '../lib/currency'

export function CurrencyPicker() {
  const { currency, setCurrency } = useSettings()
  const [accent, surface, foreground] = useThemeColor(['accent', 'surface', 'foreground'])
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 })
  const btnRef = useRef<View>(null)

  const openMenu = useCallback(() => {
    btnRef.current?.measureInWindow((x, y, width, height) => {
      setMenuPos({ top: y + height + 4, right: 20 })
      setMenuOpen(true)
    })
  }, [])

  const select = useCallback(
    (c: DisplayCurrency) => {
      setCurrency(c)
      setMenuOpen(false)
    },
    [setCurrency]
  )

  return (
    <>
      <View ref={btnRef} collapsable={false}>
        <Pressable onPress={openMenu} className="bg-surface rounded-xl px-3 py-2">
          <Text className="text-accent text-base font-semibold">{currencySymbol(currency)}</Text>
        </Pressable>
      </View>

      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}
      >
        <Pressable style={{ flex: 1 }} onPress={() => setMenuOpen(false)}>
          <View
            style={{
              position: 'absolute',
              top: menuPos.top,
              right: menuPos.right,
              backgroundColor: surface,
              borderRadius: 12,
              paddingVertical: 4,
              minWidth: 160,
              shadowColor: foreground,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.25,
              shadowRadius: 8,
              elevation: 8,
            }}
          >
            {CURRENCIES.map(c => (
              <Pressable
                key={c.value}
                onPress={() => select(c.value)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                }}
              >
                <Text
                  style={{
                    color: c.value === currency ? accent : foreground,
                    fontSize: 15,
                    fontWeight: c.value === currency ? '600' : '400',
                  }}
                >
                  {c.label}
                </Text>
                {c.value === currency && <Text style={{ color: accent, fontSize: 14 }}>✓</Text>}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  )
}
