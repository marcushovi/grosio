import { useState, useCallback, useEffect, useMemo } from 'react'
import {
  View,
  Text,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native'
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker'
import { Button } from 'heroui-native/button'
import { Input } from 'heroui-native/input'
import { Dialog } from 'heroui-native/dialog'
import { SearchField, Separator, useThemeColor } from 'heroui-native'
import { Calendar } from 'lucide-react-native'
import { getPriceOnDate, searchSymbols } from '../lib/yahooFinance'
import { useT } from '../lib/t'

interface SearchResult {
  symbol: string
  name: string
  exchange: string
  type: string
}

// Format a Date → 'YYYY-MM-DD' in local time (not UTC). Using toISOString()
// here would produce off-by-one-day bugs for users in negative-UTC offsets.
const pad = (n: number) => String(n).padStart(2, '0')
const toYyyyMmDd = (d: Date): string =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

interface AddPositionDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (position: {
    symbol: string
    name: string
    shares: number
    avg_buy_price: number
    currency: string
    buy_date: string
  }) => Promise<{ error: { message: string } | null }>
}

export function AddPositionDialog({ isOpen, onOpenChange, onAdd }: AddPositionDialogProps) {
  const { _ } = useT()
  const [accent, foreground] = useThemeColor(['accent', 'foreground'])

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedSymbol, setSelectedSymbol] = useState('')
  const [selectedName, setSelectedName] = useState('')
  const [selectedCurrency, setSelectedCurrency] = useState('USD')
  const [shares, setShares] = useState('')
  const [price, setPrice] = useState('')
  const [buyDate, setBuyDate] = useState<Date>(() => new Date())
  const [iosPickerVisible, setIosPickerVisible] = useState(false)
  const [pricingLoading, setPricingLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const buyDateIso = useMemo(() => toYyyyMmDd(buyDate), [buyDate])

  const reset = useCallback(() => {
    setSearchQuery('')
    setSearchResults([])
    setSelectedSymbol('')
    setSelectedName('')
    setShares('')
    setPrice('')
    setSelectedCurrency('USD')
    setBuyDate(new Date())
    setIosPickerVisible(false)
  }, [])

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query)
    if (query.length < 2) {
      setSearchResults([])
      return
    }
    setSearching(true)
    try {
      const results = await searchSymbols(query)
      setSearchResults(results)
    } catch {
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }, [])

  const handleSelectSymbol = useCallback((symbol: string, name: string) => {
    // The effect below auto-fetches the historical close for buyDate, so we
    // intentionally do NOT fetch the current quote here — keeps behaviour
    // consistent whether the user picked today or a past date.
    setSelectedSymbol(symbol)
    setSelectedName(name)
    setSearchResults([])
    setSearchQuery(name)
  }, [])

  // Auto-fetch the historical close price whenever the symbol or the buy date
  // changes, so the user rarely needs to touch the price field. Debounced so
  // rapid date changes don't spam the Edge Function.
  useEffect(() => {
    if (!selectedSymbol) return
    let cancelled = false
    const timer = setTimeout(async () => {
      setPricingLoading(true)
      try {
        const result = await getPriceOnDate(selectedSymbol, buyDateIso)
        if (cancelled || !result) return
        setPrice(result.close.toFixed(2))
        setSelectedCurrency(result.currency)
      } finally {
        if (!cancelled) setPricingLoading(false)
      }
    }, 300)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [selectedSymbol, buyDateIso])

  // Android: imperative native date dialog (Material calendar). iOS uses the
  // inline `<DateTimePicker display="compact">` below — doesn't need this.
  const openAndroidPicker = useCallback(() => {
    DateTimePickerAndroid.open({
      value: buyDate,
      mode: 'date',
      maximumDate: new Date(),
      onChange: (_event, selected) => {
        if (selected) setBuyDate(selected)
      },
    })
  }, [buyDate])

  const handleAdd = useCallback(async () => {
    if (!selectedSymbol) return Alert.alert(_('error'), _('selectSymbol'))
    if (!shares || parseFloat(shares) <= 0) return Alert.alert(_('error'), _('enterShares'))
    if (!price || parseFloat(price) <= 0) return Alert.alert(_('error'), _('enterPrice'))
    setSaving(true)
    const { error } = await onAdd({
      symbol: selectedSymbol,
      name: selectedName,
      shares: parseFloat(shares),
      avg_buy_price: parseFloat(price),
      currency: selectedCurrency,
      buy_date: buyDateIso,
    })
    setSaving(false)
    if (error) return Alert.alert(_('error'), error.message)
    reset()
    onOpenChange(false)
  }, [
    selectedSymbol,
    selectedName,
    shares,
    price,
    selectedCurrency,
    buyDateIso,
    onAdd,
    reset,
    onOpenChange,
    _,
  ])

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) reset()
      onOpenChange(open)
    },
    [reset, onOpenChange]
  )

  // Locale-aware display formatting for the date picker trigger, e.g.
  // "Jan 15, 2024" (en) or "15. 1. 2024" (cs/sk/de).
  const dateLabel = buyDate.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

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
            <Dialog.Title>{_('addPosition')}</Dialog.Title>
            <Dialog.Description>{_('addPositionDesc')}</Dialog.Description>

            <View className="mt-4">
              <Text className="text-muted text-sm mb-2">{_('symbol')}</Text>
              {/* Relative anchor so the results list can float over fields below */}
              <View className="relative z-10">
                <SearchField value={searchQuery} onChange={handleSearch}>
                  <SearchField.Group>
                    <SearchField.SearchIcon />
                    <SearchField.Input
                      placeholder={_('searchPlaceholder')}
                      autoCapitalize="characters"
                    />
                    <SearchField.ClearButton />
                  </SearchField.Group>
                </SearchField>

                {searching && (
                  <View
                    pointerEvents="none"
                    className="absolute right-10 top-0 bottom-0 justify-center"
                  >
                    <ActivityIndicator size="small" color={accent} />
                  </View>
                )}

                {searchResults.length > 0 && (
                  <View className="absolute top-full left-0 right-0 mt-1 z-20 bg-surface rounded-xl border border-border shadow-lg">
                    {searchResults.slice(0, 5).map((r, i) => (
                      <View key={r.symbol}>
                        {i > 0 && <Separator />}
                        <Pressable
                          onPress={() => handleSelectSymbol(r.symbol, r.name)}
                          className="px-4 py-3"
                        >
                          <Text className="text-foreground font-semibold">{r.symbol}</Text>
                          <Text className="text-muted text-xs" numberOfLines={1}>
                            {r.name}
                          </Text>
                        </Pressable>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </View>

            {selectedSymbol ? (
              <View className="mt-3 bg-background rounded-xl p-3">
                <Text className="text-accent font-semibold">{selectedSymbol}</Text>
                <Text className="text-muted text-xs">{selectedName}</Text>
              </View>
            ) : null}

            <View className="mt-4">
              <Text className="text-muted text-sm mb-2">{_('buyDate')}</Text>
              <Pressable
                onPress={() => {
                  if (Platform.OS === 'android') {
                    openAndroidPicker()
                  } else {
                    setIosPickerVisible(v => !v)
                  }
                }}
                className="bg-surface border border-border rounded-xl px-4 py-3 flex-row items-center gap-2"
              >
                <Calendar size={16} color={foreground} />
                <Text className="text-foreground flex-1">{dateLabel}</Text>
              </Pressable>

              {/*
                iOS: inline spinner rendered inside the dialog body. `<Modal>`
                or `display="compact"` both break here because the native
                popover fights with HeroUI's Dialog.Portal responder chain.
                An inline spinner is just a regular RN view — it receives taps
                normally inside the portal.
              */}
              {Platform.OS === 'ios' && iosPickerVisible && (
                <View className="mt-2 bg-surface rounded-xl border border-border">
                  <DateTimePicker
                    value={buyDate}
                    mode="date"
                    display="spinner"
                    maximumDate={new Date()}
                    onChange={(_event, selected) => {
                      if (selected) setBuyDate(selected)
                    }}
                  />
                  <View className="items-end px-2 pb-2">
                    <Button variant="ghost" size="sm" onPress={() => setIosPickerVisible(false)}>
                      <Button.Label>{_('ok')}</Button.Label>
                    </Button>
                  </View>
                </View>
              )}
            </View>

            <View className="flex-row gap-3 mt-4">
              <View className="flex-1">
                <Text className="text-muted text-sm mb-2">{_('shares')}</Text>
                <Input
                  placeholder="10"
                  value={shares}
                  onChangeText={setShares}
                  keyboardType="decimal-pad"
                />
              </View>
              <View className="flex-1">
                <View className="flex-row items-center gap-2 mb-2">
                  <Text className="text-muted text-sm">{_('buyPrice')}</Text>
                  {pricingLoading && <ActivityIndicator size="small" color={accent} />}
                </View>
                <Input
                  placeholder="0.00"
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="decimal-pad"
                />
              </View>
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
                <Button
                  variant="primary"
                  size="lg"
                  onPress={handleAdd}
                  isDisabled={saving || !selectedSymbol}
                >
                  <Button.Label>{saving ? _('adding') : _('add')}</Button.Label>
                </Button>
              </View>
            </View>
          </Dialog.Content>
        </KeyboardAvoidingView>
      </Dialog.Portal>
    </Dialog>
  )
}
