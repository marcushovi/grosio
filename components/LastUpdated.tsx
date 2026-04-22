import { Text } from 'react-native'
import { useT } from '../lib/t'
import { useFormat } from '../hooks/useFormat'

interface LastUpdatedProps {
  /** Epoch ms of the last successful fetch. 0 or undefined renders nothing. */
  timestamp: number | undefined
  className?: string
}

/** Small subtitle showing when the live price data was last fetched.
 *  Same-day fetches show only HH:MM — the full date is noisy when it's
 *  today. Older fetches use the combined date+time form so stale data
 *  (e.g. overnight) reads obviously stale. */
export function LastUpdated({ timestamp, className }: LastUpdatedProps) {
  const { _ } = useT()
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
