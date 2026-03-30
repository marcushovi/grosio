import { useState } from 'react'
import {
  View,
  Text,
  FlatList,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button } from 'heroui-native/button'
import { Input } from 'heroui-native/input'
import { Dialog } from 'heroui-native/dialog'
import { Plus } from 'lucide-react-native'
import { useBrokers } from '../../hooks/useBrokers'
import { BrokerCard } from '../../components/BrokerCard'
import { ColorPicker } from '../../components/ColorPicker'

export default function BrokersScreen() {
  const { brokers, loading, addBroker, deleteBroker } = useBrokers()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [name, setName] = useState('')
  const [color, setColor] = useState('#006fee')
  const [saving, setSaving] = useState(false)

  const handleAdd = async () => {
    if (!name.trim()) return Alert.alert('Chyba', 'Zadaj názov brokera')
    setSaving(true)
    const { error } = await addBroker(name.trim(), color)
    setSaving(false)
    if (error) return Alert.alert('Chyba', error.message)
    setName('')
    setColor('#006fee')
    setDialogOpen(false)
  }

  const handleDelete = (id: string, brokerName: string) => {
    Alert.alert('Zmazať brokera', `Naozaj chceš zmazať ${brokerName}?`, [
      { text: 'Zrušiť', style: 'cancel' },
      {
        text: 'Zmazať',
        style: 'destructive',
        onPress: async () => {
          const { error } = await deleteBroker(id)
          if (error) Alert.alert('Chyba', error.message)
        },
      },
    ])
  }

  if (loading) {
    return (
      <View className="flex-1 bg-background justify-center items-center">
        <ActivityIndicator size="large" color="#006fee" />
      </View>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-5 pt-4 pb-2 flex-row justify-between items-center mb-4">
        <Text className="text-foreground text-3xl font-bold">Brokeri</Text>
        <Button variant="primary" size="sm" onPress={() => setDialogOpen(true)}>
          <Plus color="#fafafa" size={16} />
          <Button.Label>Pridať</Button.Label>
        </Button>
      </View>

      {brokers.length === 0 ? (
        <View className="flex-1 justify-center items-center">
          <Text className="text-foreground text-lg mb-2">Zatiaľ nemáš žiadnych brokerov</Text>
          <Text className="text-muted text-sm">Pridaj svojho prvého brokera</Text>
        </View>
      ) : (
        <FlatList
          data={brokers}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <BrokerCard
              broker={item}
              totalValue={0}
              gainLoss={0}
              positionCount={0}
              onPress={() => {}}
              onLongPress={() => handleDelete(item.id, item.name)}
            />
          )}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
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
              <Dialog.Title>Nový broker</Dialog.Title>
              <Dialog.Description>Pridaj názov a farbu pre svojho brokera.</Dialog.Description>

              <View className="mt-4">
                <Text className="text-muted text-sm mb-2">Názov</Text>
                <Input
                  placeholder="napr. IBKR, XTB, Trading212..."
                  value={name}
                  onChangeText={setName}
                />
              </View>

              <View className="mt-4">
                <Text className="text-muted text-sm mb-2">Farba</Text>
                <ColorPicker selected={color} onChange={setColor} />
              </View>

              <View className="flex-row gap-3 mt-6">
                <View className="flex-1">
                  <Button variant="outline" size="lg" onPress={() => setDialogOpen(false)}>
                    <Button.Label>Zrušiť</Button.Label>
                  </Button>
                </View>
                <View className="flex-1">
                  <Button variant="primary" size="lg" onPress={handleAdd} isDisabled={saving}>
                    <Button.Label>{saving ? 'Ukladám...' : 'Uložiť'}</Button.Label>
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
