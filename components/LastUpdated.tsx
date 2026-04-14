import { Text } from 'react-native'
import { useT } from '../lib/t'

interface LastUpdatedProps {
  /** Epoch ms of the last successful fetch. 0 or undefined renders nothing. */
  timestamp: number | undefined
  className?: string
}

// Same-day fetches show only HH:MM. Older than today fall back to a short
// "Mon DD, HH:MM" so stale data (e.g. overnight) reads obviously stale.
function formatTimestamp(ts: number): string {
  const d = new Date(ts)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  return isToday
    ? d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
}

/** Small subtitle showing when the live price data was last fetched. */
export function LastUpdated({ timestamp, className }: LastUpdatedProps) {
  const { _ } = useT()
  if (!timestamp) return null
  return (
    <Text className={`text-muted text-xs ${className ?? ''}`}>
      {_('lastUpdated')}: {formatTimestamp(timestamp)}
    </Text>
  )
}
