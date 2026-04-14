import { useState, useCallback } from 'react'
import { View, Text, Alert, KeyboardAvoidingView, Platform } from 'react-native'
import { Button } from 'heroui-native/button'
import { Input } from 'heroui-native/input'
import { Dialog } from 'heroui-native/dialog'
import { ColorPicker, COLORS } from './ColorPicker'
import { useT } from '../lib/t'
import { useBrokers } from '../hooks/useBrokers'

interface AddBrokerDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

export function AddBrokerDialog({ isOpen, onOpenChange }: AddBrokerDialogProps) {
  const { _ } = useT()
  const { addBrokerMutation } = useBrokers()
  const [name, setName] = useState('')
  const [color, setColor] = useState(COLORS[0])

  const reset = useCallback(() => {
    setName('')
    setColor(COLORS[0])
  }, [])

  const handleAdd = useCallback(() => {
    const trimmed = name.trim()
    if (!trimmed) {
      Alert.alert(_('error'), _('enterBrokerName'))
      return
    }
    addBrokerMutation.mutate(
      { name: trimmed, color },
      {
        onSuccess: () => {
          reset()
          onOpenChange(false)
        },
        onError: e => {
          Alert.alert(_('error'), e instanceof Error ? e.message : String(e))
        },
      }
    )
  }, [name, color, addBrokerMutation, reset, onOpenChange, _])

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) reset()
      onOpenChange(open)
    },
    [reset, onOpenChange]
  )

  const saving = addBrokerMutation.isPending

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
            <Dialog.Title>{_('newBroker')}</Dialog.Title>
            <Dialog.Description>{_('newBrokerDesc')}</Dialog.Description>

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
                    reset()
                    onOpenChange(false)
                  }}
                >
                  <Button.Label>{_('cancel')}</Button.Label>
                </Button>
              </View>
              <View className="flex-1">
                <Button variant="primary" size="lg" onPress={handleAdd} isDisabled={saving}>
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
