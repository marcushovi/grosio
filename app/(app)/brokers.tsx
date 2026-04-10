import { useState, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useFocusEffect } from 'expo-router'
import { Button } from 'heroui-native/button'
import { Input } from 'heroui-native/input'
import { Dialog } from 'heroui-native/dialog'
import { useThemeColor } from 'heroui-native'
import { Plus } from 'lucide-react-native'
import { useBrokers } from '../../hooks/useBrokers'
import { useDashboardData } from '../../hooks/useDashboardData'
import { BrokerCard } from '../../components/BrokerCard'
import { ColorPicker, COLORS } from '../../components/ColorPicker'
import { useT } from '../../lib/t'

export default function BrokersScreen() {
  const { _ } = useT()
  const accentFg = useThemeColor('accent-foreground')
  const router = useRouter()
  const { brokers, loading, error: brokersError, addBroker, deleteBroker, refetch } = useBrokers()
  const { brokerValues } = useDashboardData(brokers)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [name, setName] = useState('')
  const [color, setColor] = useState(COLORS[0])
  const [saving, setSaving] = useState(false)

  useFocusEffect(
    useCallback(() => {
      refetch()
    }, [refetch])
  )

  const handleAdd = async () => {
    if (!name.trim()) return Alert.alert(_('error'), _('enterBrokerName'))
    setSaving(true)
    const { error } = await addBroker(name.trim(), color)
    setSaving(false)
    if (error) return Alert.alert(_('error'), error.message)
    setName('')
    setColor(COLORS[0])
    setDialogOpen(false)
  }

  const handleDelete = (id: string, brokerName: string) => {
    Alert.alert(_('deleteBroker'), _('deleteBrokerMsg', { name: brokerName }), [
      { text: _('cancel'), style: 'cancel' },
      {
        text: _('delete'),
        style: 'destructive',
        onPress: async () => {
          const { error } = await deleteBroker(id)
          if (error) Alert.alert(_('error'), error.message)
        },
      },
    ])
  }

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-background justify-center items-center">
        <ActivityIndicator size="large" />
      </SafeAreaView>
    )
  }

  if (brokersError) {
    return (
      <SafeAreaView className="flex-1 bg-background justify-center items-center px-6">
        <Text className="text-danger text-center mb-4">{brokersError}</Text>
        <Text className="text-accent" onPress={refetch}>
          {_('tryAgain')}
        </Text>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-5 pt-4 pb-2 flex-row justify-between items-center mb-4">
        <Text className="text-foreground text-3xl font-bold">{_('brokers')}</Text>
        <Button variant="primary" size="sm" onPress={() => setDialogOpen(true)}>
          <Plus color={accentFg as string} size={16} />
          <Button.Label>{_('addBroker')}</Button.Label>
        </Button>
      </View>

      {brokers.length === 0 ? (
        <View className="flex-1 justify-center items-center">
          <Text className="text-foreground text-lg mb-2">{_('noBrokersYet')}</Text>
          <Text className="text-muted text-sm">{_('addFirstBroker')}</Text>
        </View>
      ) : (
        <FlatList
          data={brokers}
          keyExtractor={item => item.id}
          renderItem={({ item }) => {
            const bv = brokerValues.find(v => v.brokerId === item.id)
            return (
              <BrokerCard
                broker={item}
                totalValue={bv?.value ?? 0}
                gainLoss={bv?.gainLoss ?? 0}
                positionCount={bv?.positionCount ?? 0}
                onPress={() => router.push(`/(app)/broker/${item.id}`)}
                onLongPress={() => handleDelete(item.id, item.name)}
              />
            )
          }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} />}
        />
      )}

      <Dialog isOpen={dialogOpen} onOpenChange={setDialogOpen}>
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
                <Input
                  placeholder={_('brokerNamePlaceholder')}
                  value={name}
                  onChangeText={setName}
                />
              </View>

              <View className="mt-4">
                <Text className="text-muted text-sm mb-2">{_('color')}</Text>
                <ColorPicker selected={color} onChange={setColor} />
              </View>

              <View className="flex-row gap-3 mt-6">
                <View className="flex-1">
                  <Button variant="outline" size="lg" onPress={() => setDialogOpen(false)}>
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
    </SafeAreaView>
  )
}
