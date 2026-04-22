import { useState, useCallback, useEffect, useMemo } from 'react'
import { View, Text, Alert, KeyboardAvoidingView, Platform, Pressable } from 'react-native'
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker'
import { Button } from 'heroui-native/button'
import { Input } from 'heroui-native/input'
import { Dialog } from 'heroui-native/dialog'
import { useThemeColor } from 'heroui-native'
import { Calendar } from 'lucide-react-native'
import { useT } from '@/lib/t'
import { toYyyyMmDd } from '@/lib/format'
import { useFormat } from '@/hooks/useFormat'
import { useSellPosition } from '@/hooks/usePositions'
import type { Position } from '@/types'

interface SellPositionDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  position: Position
}

export function SellPositionDialog({ isOpen, onOpenChange, position }: SellPositionDialogProps) {
  const { _ } = useT()
  const f = useFormat()
  const foreground = useThemeColor('foreground') as string
  const sellPositionMutation = useSellPosition()

  const [soldDate, setSoldDate] = useState<Date>(() => new Date())
  const [soldPrice, setSoldPrice] = useState('')
  const [iosPickerVisible, setIosPickerVisible] = useState(false)

  const soldDateIso = useMemo(() => toYyyyMmDd(soldDate), [soldDate])

  // Reset on open so a previous failed attempt doesn't pre-fill stale values.
  useEffect(() => {
    if (isOpen) {
      setSoldDate(new Date())
      setSoldPrice('')
      setIosPickerVisible(false)
    }
  }, [isOpen])

  // Min sale date = buy date (DB constraint `positions_sold_after_buy`).
  // Legacy positions without a buy_date have no lower bound.
  const minDate = useMemo(
    () => (position.buy_date ? new Date(`${position.buy_date}T00:00:00`) : undefined),
    [position.buy_date]
  )

  const openAndroidPicker = useCallback(() => {
    DateTimePickerAndroid.open({
      value: soldDate,
      mode: 'date',
      maximumDate: new Date(),
      minimumDate: minDate,
      onChange: (_event, selected) => {
        if (selected) setSoldDate(selected)
      },
    })
  }, [soldDate, minDate])

  const handleSubmit = useCallback(() => {
    const parsedPrice = parseFloat(soldPrice)
    if (!soldPrice || Number.isNaN(parsedPrice) || parsedPrice <= 0) {
      return Alert.alert(_('error'), _('enterSoldPrice'))
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(soldDateIso)) {
      return Alert.alert(_('error'), _('invalidSoldDate'))
    }
    if (position.buy_date && soldDateIso < position.buy_date) {
      return Alert.alert(_('error'), _('soldDateBeforeBuy'))
    }
    sellPositionMutation.mutate(
      { positionId: position.id, soldDate: soldDateIso, soldPrice: parsedPrice },
      {
        onSuccess: () => onOpenChange(false),
        onError: e => Alert.alert(_('error'), e instanceof Error ? e.message : String(e)),
      }
    )
  }, [soldPrice, soldDateIso, position, sellPositionMutation, onOpenChange, _])

  const dateLabel = f.formatDate(soldDate)

  const saving = sellPositionMutation.isPending

  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1 justify-center"
        >
          <Dialog.Content>
            <Dialog.Close className="self-end" />
            <Dialog.Title>{_('sellPosition')}</Dialog.Title>
            <Dialog.Description>{_('sellPositionDesc')}</Dialog.Description>

            {/* Read-only summary of the position being sold. */}
            <View className="mt-4 bg-background rounded-xl p-3">
              <Text className="text-accent font-semibold">{position.symbol}</Text>
              <Text className="text-muted text-xs">{position.name}</Text>
              <View className="flex-row justify-between mt-2">
                <Text className="text-muted text-xs">
                  {position.shares}× {f.formatCurrency(position.buy_price, position.currency)}
                </Text>
                {position.buy_date && (
                  <Text className="text-muted text-xs">{f.formatDate(position.buy_date)}</Text>
                )}
              </View>
            </View>

            <View className="mt-4">
              <Text className="text-muted text-sm mb-2">{_('soldDate')}</Text>
              <Pressable
                onPress={() => {
                  if (Platform.OS === 'android') {
                    openAndroidPicker()
                  } else {
                    setIosPickerVisible(v => !v)
                  }
                }}
                className="bg-surface border border-border rounded-xl px-4 py-3 flex-row items-center gap-2"
              >
                <Calendar size={16} color={foreground} />
                <Text className="text-foreground flex-1">{dateLabel}</Text>
              </Pressable>

              {Platform.OS === 'ios' && iosPickerVisible && (
                <View className="mt-2 bg-surface rounded-xl border border-border">
                  <DateTimePicker
                    value={soldDate}
                    mode="date"
                    display="spinner"
                    maximumDate={new Date()}
                    minimumDate={minDate}
                    onChange={(_event, selected) => {
                      if (selected) setSoldDate(selected)
                    }}
                  />
                  <View className="items-end px-2 pb-2">
                    <Button variant="ghost" size="sm" onPress={() => setIosPickerVisible(false)}>
                      <Button.Label>{_('ok')}</Button.Label>
                    </Button>
                  </View>
                </View>
              )}
            </View>

            <View className="mt-4">
              <Text className="text-muted text-sm mb-2">
                {_('soldPrice')} ({position.currency})
              </Text>
              <Input
                placeholder="0.00"
                value={soldPrice}
                onChangeText={setSoldPrice}
                keyboardType="decimal-pad"
              />
            </View>

            <View className="flex-row gap-3 mt-6">
              <View className="flex-1">
                <Button variant="outline" size="lg" onPress={() => onOpenChange(false)}>
                  <Button.Label>{_('cancel')}</Button.Label>
                </Button>
              </View>
              <View className="flex-1">
                <Button variant="primary" size="lg" onPress={handleSubmit} isDisabled={saving}>
                  <Button.Label>{saving ? _('saving') : _('markAsSold')}</Button.Label>
                </Button>
              </View>
            </View>
          </Dialog.Content>
        </KeyboardAvoidingView>
      </Dialog.Portal>
    </Dialog>
  )
}
