import { Text } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useFormat } from '@/hooks/useFormat'

interface LastUpdatedProps {
  // Epoch ms of the last successful fetch. 0 / undefined renders nothing.
  timestamp: number | undefined
  className?: string
}

// Same-day fetches show only HH:MM. Older ones use the combined date+time
// form so stale data reads obviously stale.
export function LastUpdated({ timestamp, className }: LastUpdatedProps) {
  const { t: _ } = useTranslation()
  const f = useFormat()
  if (!timestamp) return null
  const d = new Date(timestamp)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const label = isToday ? f.formatTime(d) : f.formatDateTime(d)
  return (
    <Text className={`text-muted text-xs ${className ?? ''}`}>
      {_('lastUpdated')}: {label}
    </Text>
  )
}
