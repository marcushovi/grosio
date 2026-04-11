import { View } from 'react-native'
import { Skeleton } from 'heroui-native'

export function DashboardSkeleton() {
  return (
    <View style={{ padding: 20, gap: 16 }}>
      {/* Title row */}
      <View className="flex-row items-center justify-between">
        <Skeleton className="h-9 w-40 rounded-lg" />
        <Skeleton className="h-9 w-10 rounded-xl" />
      </View>

      {/* Total value card */}
      <Skeleton className="h-36 w-full rounded-2xl" />

      {/* Allocation chart */}
      <Skeleton className="h-40 w-full rounded-2xl" />

      {/* Broker cards */}
      <Skeleton className="h-5 w-40 rounded-lg" />
      <Skeleton className="h-24 w-full rounded-2xl" />
      <Skeleton className="h-24 w-full rounded-2xl" />
    </View>
  )
}

export function BrokerListSkeleton() {
  return (
    <View style={{ padding: 20, gap: 12 }}>
      <Skeleton className="h-28 w-full rounded-2xl" />
      <Skeleton className="h-28 w-full rounded-2xl" />
      <Skeleton className="h-28 w-full rounded-2xl" />
    </View>
  )
}

export function BrokerDetailSkeleton() {
  return (
    <View style={{ padding: 20, gap: 12 }}>
      {/* Summary card */}
      <Skeleton className="h-28 w-full rounded-2xl" />

      {/* Position cards */}
      <Skeleton className="h-20 w-full rounded-2xl" />
      <Skeleton className="h-20 w-full rounded-2xl" />
      <Skeleton className="h-20 w-full rounded-2xl" />
    </View>
  )
}
