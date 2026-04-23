import { useState, useCallback } from 'react'
import { View, Text, Alert, KeyboardAvoidingView, Platform } from 'react-native'
import { Button } from 'heroui-native/button'
import { Input } from 'heroui-native/input'
import { Dialog } from 'heroui-native/dialog'
import { ColorPicker, COLORS } from '@/components/ColorPicker'
import { useTranslation } from 'react-i18next'
import { useBrokers, useUpdateBroker } from '@/hooks/useBrokers'
import type { Broker } from '@/types'

interface AddBrokerDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  mode?: 'create' | 'edit'
  broker?: Broker
}

export function AddBrokerDialog({
  isOpen,
  onOpenChange,
  mode = 'create',
  broker,
}: AddBrokerDialogProps) {
  const { t: _ } = useTranslation()
  const { addBrokerMutation } = useBrokers()
  const updateBrokerMutation = useUpdateBroker()
  const isEdit = mode === 'edit'

  const [name, setName] = useState(broker?.name ?? '')
  const [color, setColor] = useState(broker?.color ?? COLORS[0])

  const reset = useCallback(() => {
    setName('')
    setColor(COLORS[0])
  }, [])

  const handleSubmit = useCallback(() => {
    const trimmed = name.trim()
    if (!trimmed) {
      Alert.alert(_('error'), _('enterBrokerName'))
      return
    }
    if (isEdit && broker) {
      updateBrokerMutation.mutate(
        { brokerId: broker.id, input: { name: trimmed, color } },
        {
          onSuccess: () => onOpenChange(false),
          onError: e => Alert.alert(_('error'), e instanceof Error ? e.message : String(e)),
        }
      )
      return
    }
    addBrokerMutation.mutate(
      { name: trimmed, color },
      {
        onSuccess: () => {
          reset()
          onOpenChange(false)
        },
        onError: e => Alert.alert(_('error'), e instanceof Error ? e.message : String(e)),
      }
    )
  }, [name, color, isEdit, broker, addBrokerMutation, updateBrokerMutation, reset, onOpenChange, _])

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open && !isEdit) reset()
      onOpenChange(open)
    },
    [isEdit, reset, onOpenChange]
  )

  const saving = isEdit ? updateBrokerMutation.isPending : addBrokerMutation.isPending
  const title = isEdit ? _('editBroker') : _('newBroker')
  const description = isEdit ? _('editBrokerDesc') : _('newBrokerDesc')

  return (
    <Dialog isOpen={isOpen} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1 justify-center"
        >
          <Dialog.Content>
            <Dialog.Close className="self-end" />
            <Dialog.Title>{title}</Dialog.Title>
            <Dialog.Description>{description}</Dialog.Description>

            <View className="mt-4">
              <Text className="text-muted text-sm mb-2">{_('brokerName')}</Text>
              <Input placeholder={_('brokerNamePlaceholder')} value={name} onChangeText={setName} />
            </View>

            <View className="mt-4">
              <Text className="text-muted text-sm mb-2">{_('color')}</Text>
              <ColorPicker selected={color} onChange={setColor} />
            </View>

            <View className="flex-row gap-3 mt-6">
              <View className="flex-1">
                <Button
                  variant="outline"
                  size="lg"
                  onPress={() => {
                    if (!isEdit) reset()
                    onOpenChange(false)
                  }}
                >
                  <Button.Label>{_('cancel')}</Button.Label>
                </Button>
              </View>
              <View className="flex-1">
                <Button variant="primary" size="lg" onPress={handleSubmit} isDisabled={saving}>
                  <Button.Label>{saving ? _('saving') : _('save')}</Button.Label>
                </Button>
              </View>
            </View>
          </Dialog.Content>
        </KeyboardAvoidingView>
      </Dialog.Portal>
    </Dialog>
  )
}
