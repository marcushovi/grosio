import { View, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Card } from 'heroui-native/card'

export default function DashboardScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-5 pt-4 pb-2">
        <Text className="text-foreground text-3xl font-bold">Prehľad</Text>
      </View>
      <View className="px-5 mt-4">
        <Card className="bg-content1 p-5 mb-3">
          <Text className="text-default-400 text-sm mb-1">Celkový majetok</Text>
          <Text className="text-foreground text-4xl font-bold">€0.00</Text>
          <Text className="text-default-400 text-sm mt-1">Pridaj brokera a pozície</Text>
        </Card>
      </View>
    </SafeAreaView>
  )
}
