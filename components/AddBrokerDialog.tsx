import { useState, useCallback } from 'react'
import { View, Text, Alert, KeyboardAvoidingView, Platform } from 'react-native'
import { Button } from 'heroui-native/button'
import { Input } from 'heroui-native/input'
import { Dialog } from 'heroui-native/dialog'
import { ColorPicker, COLORS } from './ColorPicker'
import { useT } from '../lib/t'

interface AddBrokerDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (name: string, color: string) => Promise<{ error: { message: string } | null }>
}

export function AddBrokerDialog({ isOpen, onOpenChange, onAdd }: AddBrokerDialogProps) {
  const { _ } = useT()
  const [name, setName] = useState('')
  const [color, setColor] = useState(COLORS[0])
  const [saving, setSaving] = useState(false)

  const reset = useCallback(() => {
    setName('')
    setColor(COLORS[0])
  }, [])

  const handleAdd = useCallback(async () => {
    if (!name.trim()) return Alert.alert(_('error'), _('enterBrokerName'))
    setSaving(true)
    const { error } = await onAdd(name.trim(), color)
    setSaving(false)
    if (error) return Alert.alert(_('error'), error.message)
    reset()
    onOpenChange(false)
  }, [name, color, onAdd, reset, onOpenChange, _])

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) reset()
      onOpenChange(open)
    },
    [reset, onOpenChange]
  )

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
