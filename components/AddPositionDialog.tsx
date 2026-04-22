import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import {
  View,
  Text,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
} from 'react-native'
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker'
import { Button } from 'heroui-native/button'
import { Input } from 'heroui-native/input'
import { Dialog } from 'heroui-native/dialog'
import { SearchField, Separator, useThemeColor } from 'heroui-native'
import { Calendar } from 'lucide-react-native'
import { getPriceOnDate, searchSymbols } from '../lib/yahooFinance'
import { useT } from '../lib/t'
import { toYyyyMmDd } from '../lib/format'
import { useFormat } from '../hooks/useFormat'
import { useUpdatePosition } from '../hooks/usePositions'
import type { Position, PositionCurrency } from '../types'

interface SearchResult {
  symbol: string
  name: string
  exchange: string
  type: string
}

interface AddPositionDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  mode?: 'create' | 'edit'
  /** Create mode: parent wires the mutation (kept as a callback for
   *  compatibility with the existing broker-detail `usePositions().addPosition`
   *  wrapper). Edit mode: not used — the dialog calls `useUpdatePosition`
   *  internally. */
  onAdd?: (position: {
    symbol: string
    name: string
    shares: number
    buy_price: number
    currency: PositionCurrency
    buy_date: string
  }) => Promise<{ error: { message: string } | null }>
  /** Required when `mode === 'edit'`. */
  position?: Position
}

export function AddPositionDialog({
  isOpen,
  onOpenChange,
  mode = 'create',
  onAdd,
  position,
}: AddPositionDialogProps) {
  const { _ } = useT()
  const f = useFormat()
  const [accent, foreground] = useThemeColor(['accent', 'foreground'])
  const updatePositionMutation = useUpdatePosition()
  const isEdit = mode === 'edit'

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedSymbol, setSelectedSymbol] = useState(position?.symbol ?? '')
  const [selectedName, setSelectedName] = useState(position?.name ?? '')
  const [selectedCurrency, setSelectedCurrency] = useState<PositionCurrency>(
    position?.currency ?? 'USD'
  )
  const [shares, setShares] = useState(position ? String(position.shares) : '')
  const [price, setPrice] = useState(position ? String(position.buy_price) : '')
  const [isPriceManuallyEdited, setIsPriceManuallyEdited] = useState(isEdit)
  const [buyDate, setBuyDate] = useState<Date>(() =>
    position?.buy_date ? new Date(`${position.buy_date}T00:00:00`) : new Date()
  )
  const [iosPickerVisible, setIosPickerVisible] = useState(false)
  const [pricingLoading, setPricingLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const buyDateIso = useMemo(() => toYyyyMmDd(buyDate), [buyDate])

  // Re-seed form when the dialog is (re)opened for a different position.
  useEffect(() => {
    if (!isOpen) return
    if (isEdit && position) {
      setSelectedSymbol(position.symbol)
      setSelectedName(position.name)
      setSelectedCurrency(position.currency)
      setShares(String(position.shares))
      setPrice(String(position.buy_price))
      setIsPriceManuallyEdited(true) // don't auto-fetch in edit mode
      setBuyDate(position.buy_date ? new Date(`${position.buy_date}T00:00:00`) : new Date())
      setSearchQuery(position.name)
      setSearchResults([])
    }
  }, [isOpen, isEdit, position])

  // Debounce the ticker search + track the latest request id so an earlier
  // (slower) response can't overwrite the result of a newer query. Without
  // this, rapid typing produces out-of-order results.
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchRequestIdRef = useRef(0)

  const reset = useCallback(() => {
    setSearchQuery('')
    setSearchResults([])
    setSelectedSymbol('')
    setSelectedName('')
    setShares('')
    setPrice('')
    setIsPriceManuallyEdited(false)
    setSelectedCurrency('USD')
    setBuyDate(new Date())
    setIosPickerVisible(false)
  }, [])

  const handleSearch = useCallback(
    (query: string) => {
      // Symbol search is disabled in edit mode — a position's symbol is
      // immutable from the UI (see dialog-level flag). If the user wants a
      // different ticker, they delete and create anew.
      if (isEdit) return
      setSearchQuery(query)
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
      if (query.length < 2) {
        setSearchResults([])
        setSearching(false)
        return
      }
      setSearching(true)
      searchTimeoutRef.current = setTimeout(async () => {
        const reqId = ++searchRequestIdRef.current
        try {
          const results = await searchSymbols(query)
          if (reqId !== searchRequestIdRef.current) return
          setSearchResults(results)
        } catch {
          if (reqId !== searchRequestIdRef.current) return
          setSearchResults([])
        } finally {
          if (reqId === searchRequestIdRef.current) setSearching(false)
        }
      }, 300)
    },
    [isEdit]
  )

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    }
  }, [])

  const handleSelectSymbol = useCallback((symbol: string, name: string) => {
    // The effect below auto-fetches the historical close for buyDate, so we
    // intentionally do NOT fetch the current quote here — keeps behaviour
    // consistent whether the user picked today or a past date.
    setSelectedSymbol(symbol)
    setSelectedName(name)
    // New symbol → fresh auto-fill. Clear any earlier manual-edit flag so the
    // auto-fetch effect populates the price for the new ticker.
    setIsPriceManuallyEdited(false)
    setSearchResults([])
    setSearchQuery(name)
  }, [])

  // Auto-fetch the historical close price whenever the symbol or the buy date
  // changes, so the user rarely needs to touch the price field. Debounced so
  // rapid date changes don't spam the Edge Function. Disabled in edit mode —
  // the stored buy price is what the user chose and must not be overwritten.
  useEffect(() => {
    if (isEdit) return
    if (!selectedSymbol) return
    let cancelled = false
    const timer = setTimeout(async () => {
      setPricingLoading(true)
      try {
        const result = await getPriceOnDate(selectedSymbol, buyDateIso)
        if (cancelled || !result) return
        // Respect the user's manual edit — don't overwrite a typed price when
        // the buy date changes afterwards. The flag is reset on symbol switch.
        if (!isPriceManuallyEdited) setPrice(result.close.toFixed(2))
        setSelectedCurrency(result.currency)
      } finally {
        if (!cancelled) setPricingLoading(false)
      }
    }, 300)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [selectedSymbol, buyDateIso, isPriceManuallyEdited, isEdit])

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

  const handleSubmit = useCallback(async () => {
    if (!selectedSymbol) return Alert.alert(_('error'), _('selectSymbol'))
    if (!shares || parseFloat(shares) <= 0) return Alert.alert(_('error'), _('enterShares'))
    if (!price || parseFloat(price) <= 0) return Alert.alert(_('error'), _('enterPrice'))
    if (!/^\d{4}-\d{2}-\d{2}$/.test(buyDateIso)) return Alert.alert(_('error'), _('invalidBuyDate'))
    const parsedDate = new Date(`${buyDateIso}T00:00:00`)
    if (Number.isNaN(parsedDate.getTime()) || parsedDate > new Date()) {
      return Alert.alert(_('error'), _('invalidBuyDate'))
    }

    if (isEdit && position) {
      setSaving(true)
      updatePositionMutation.mutate(
        {
          positionId: position.id,
          input: {
            symbol: selectedSymbol,
            name: selectedName,
            shares: parseFloat(shares),
            buy_price: parseFloat(price),
            currency: selectedCurrency,
            buy_date: buyDateIso,
          },
        },
        {
          onSuccess: () => {
            setSaving(false)
            onOpenChange(false)
          },
          onError: e => {
            setSaving(false)
            Alert.alert(_('error'), e instanceof Error ? e.message : String(e))
          },
        }
      )
      return
    }

    if (!onAdd) return
    setSaving(true)
    const { error } = await onAdd({
      symbol: selectedSymbol,
      name: selectedName,
      shares: parseFloat(shares),
      buy_price: parseFloat(price),
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
    isEdit,
    position,
    updatePositionMutation,
    _,
  ])

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open && !isEdit) reset()
      onOpenChange(open)
    },
    [isEdit, reset, onOpenChange]
  )

  // App-language-aware display of the picked date. The underlying native
  // DateTimePicker uses OS locale for its own wheel labels — that stays.
  const dateLabel = f.formatDate(buyDate)

  const title = isEdit ? _('editPosition') : _('addPosition')
  const description = isEdit ? _('editPositionDesc') : _('addPositionDesc')

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
            <Dialog.Title>{title}</Dialog.Title>
            <Dialog.Description>{description}</Dialog.Description>

            <View className="mt-4">
              <Text className="text-muted text-sm mb-2">{_('symbol')}</Text>
              {isEdit ? (
                <View className="bg-background rounded-xl p-3">
                  <Text className="text-accent font-semibold">{selectedSymbol}</Text>
                  <Text className="text-muted text-xs">{selectedName}</Text>
                </View>
              ) : (
                <>
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
                      <View
                        className="absolute top-full left-0 right-0 mt-1 z-20 bg-surface rounded-xl border border-border shadow-lg"
                        style={styles.searchDropdown}
                      >
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

                  {selectedSymbol ? (
                    <View className="mt-3 bg-background rounded-xl p-3">
                      <Text className="text-accent font-semibold">{selectedSymbol}</Text>
                      <Text className="text-muted text-xs">{selectedName}</Text>
                    </View>
                  ) : null}
                </>
              )}
            </View>

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
                  onChangeText={text => {
                    setIsPriceManuallyEdited(true)
                    setPrice(text)
                  }}
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
                    if (!isEdit) reset()
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
                  onPress={handleSubmit}
                  isDisabled={saving || !selectedSymbol}
                >
                  <Button.Label>
                    {saving ? (isEdit ? _('saving') : _('adding')) : isEdit ? _('save') : _('add')}
                  </Button.Label>
                </Button>
              </View>
            </View>
          </Dialog.Content>
        </KeyboardAvoidingView>
      </Dialog.Portal>
    </Dialog>
  )
}

// Explicit Android elevation — the floating search-results dropdown needs to
// render above the form fields beneath it, which `shadow-lg`'s elevation
// mapping doesn't reliably provide on older Android.
const styles = StyleSheet.create({
  searchDropdown: {
    elevation: 8,
  },
})
