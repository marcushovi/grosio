import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
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
import { getPriceOnDate, searchSymbols } from '@/lib/api/yahoo'
import { STALE_TIME } from '@/lib/queryClient'
import { useTranslation } from 'react-i18next'
import { toYyyyMmDd } from '@/lib/format'
import { useFormat } from '@/hooks/useFormat'
import { useUpdatePosition } from '@/hooks/usePositions'
import type { Position, PositionCurrency } from '@/types'

const SEARCH_DEBOUNCE_MS = 300
const SEARCH_MIN_CHARS = 2
const SEARCH_RESULT_LIMIT = 5

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
  // Create mode only. Kept as callback for compatibility with the broker-
  // detail `usePositions().addPosition` wrapper.
  onAdd?: (position: {
    symbol: string
    name: string
    shares: number
    buy_price: number
    currency: PositionCurrency
    buy_date: string
  }) => Promise<{ error: { message: string } | null }>
  position?: Position
}

// One bag for the whole form. Patched via `setForm(prev => …)` so multi-field
// updates (e.g. picking a symbol) stay atomic.
interface FormState {
  searchQuery: string
  symbol: string
  name: string
  currency: PositionCurrency
  shares: string
  price: string
  // Once the user has typed in the price box, auto-fetched quotes must not
  // overwrite it. Pre-seeded true in edit mode to protect the stored value.
  priceEdited: boolean
  buyDate: Date
}

function initialFormState(position: Position | undefined, isEdit: boolean): FormState {
  return {
    searchQuery: '',
    symbol: position?.symbol ?? '',
    name: position?.name ?? '',
    currency: position?.currency ?? 'USD',
    shares: position ? String(position.shares) : '',
    price: position ? String(position.buy_price) : '',
    priceEdited: isEdit,
    buyDate: position?.buy_date ? new Date(`${position.buy_date}T00:00:00`) : new Date(),
  }
}

export function AddPositionDialog({
  isOpen,
  onOpenChange,
  mode = 'create',
  onAdd,
  position,
}: AddPositionDialogProps) {
  const { t: _ } = useTranslation()
  const f = useFormat()
  const [accent, foreground] = useThemeColor(['accent', 'foreground'])
  const updatePositionMutation = useUpdatePosition()
  const isEdit = mode === 'edit'

  const [form, setForm] = useState<FormState>(() => initialFormState(position, isEdit))
  // Everything below is non-form UI/async state, kept separate from the form
  // bag so a keystroke in a text field does not re-render the search dropdown.
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [iosPickerVisible, setIosPickerVisible] = useState(false)
  const [saving, setSaving] = useState(false)

  const buyDateIso = toYyyyMmDd(form.buyDate)

  // Debounced symbol search with a request-id guard so an earlier (slower)
  // response cannot overwrite a newer one.
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchRequestIdRef = useRef(0)

  const handleSearch = (query: string) => {
    // Symbol is immutable in edit mode. To change it, delete and recreate.
    if (isEdit) return
    setForm(prev => ({ ...prev, searchQuery: query }))
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    if (query.length < SEARCH_MIN_CHARS) {
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
    }, SEARCH_DEBOUNCE_MS)
  }

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    }
  }, [])

  const handleSelectSymbol = (symbol: string, name: string) => {
    // Fresh symbol → clear priceEdited so the auto-fetched close populates
    // the price box for the new ticker.
    setForm(prev => ({ ...prev, symbol, name, searchQuery: name, priceEdited: false }))
    setSearchResults([])
  }

  // Auto-fill historical close when symbol or buy date changes. Skip in edit
  // mode — stored buy price must not be overwritten. TanStack caches by
  // (symbol, date) so flipping between already-seen combos is instant.
  const { data: pricing, isFetching: pricingLoading } = useQuery({
    queryKey: ['priceOnDate', form.symbol, buyDateIso],
    queryFn: () => getPriceOnDate(form.symbol, buyDateIso),
    enabled: !isEdit && !!form.symbol,
    staleTime: STALE_TIME.RATES,
  })

  // Propagate query result to form fields. Honours manual edits to the price.
  useEffect(() => {
    if (!pricing) return
    setForm(prev => ({
      ...prev,
      price: prev.priceEdited ? prev.price : pricing.close.toFixed(2),
      currency: pricing.currency,
    }))
  }, [pricing])

  // iOS uses the inline <DateTimePicker> below. Android needs this imperative
  // native dialog because the inline picker doesn't match Material guidelines.
  const openAndroidPicker = () => {
    DateTimePickerAndroid.open({
      value: form.buyDate,
      mode: 'date',
      maximumDate: new Date(),
      onChange: (_event, selected) => {
        if (selected) setForm(prev => ({ ...prev, buyDate: selected }))
      },
    })
  }

  const handleSubmit = async () => {
    const { symbol, name, shares, price, currency } = form
    if (!symbol) return Alert.alert(_('error'), _('selectSymbol'))
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
            symbol,
            name,
            shares: parseFloat(shares),
            buy_price: parseFloat(price),
            currency,
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
      symbol,
      name,
      shares: parseFloat(shares),
      buy_price: parseFloat(price),
      currency,
      buy_date: buyDateIso,
    })
    setSaving(false)
    if (error) return Alert.alert(_('error'), error.message)
    setForm(initialFormState(undefined, false))
    onOpenChange(false)
  }

  const handleOpenChange = (open: boolean) => {
    if (!open && !isEdit) setForm(initialFormState(undefined, false))
    onOpenChange(open)
  }

  const dateLabel = f.formatDate(form.buyDate)
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
                  <Text className="text-accent font-semibold">{form.symbol}</Text>
                  <Text className="text-muted text-xs">{form.name}</Text>
                </View>
              ) : (
                <>
                  {/* Relative anchor so the results list floats over fields below. */}
                  <View className="relative z-10">
                    <SearchField value={form.searchQuery} onChange={handleSearch}>
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
                      >
                        {searchResults.slice(0, SEARCH_RESULT_LIMIT).map((r, i) => (
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

                  {form.symbol ? (
                    <View className="mt-3 bg-background rounded-xl p-3">
                      <Text className="text-accent font-semibold">{form.symbol}</Text>
                      <Text className="text-muted text-xs">{form.name}</Text>
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

              {Platform.OS === 'ios' && iosPickerVisible && (
                <View className="mt-2 bg-surface rounded-xl border border-border">
                  <DateTimePicker
                    value={form.buyDate}
                    mode="date"
                    display="spinner"
                    maximumDate={new Date()}
                    onChange={(_event, selected) => {
                      if (selected) setForm(prev => ({ ...prev, buyDate: selected }))
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
                  value={form.shares}
                  onChangeText={shares => setForm(prev => ({ ...prev, shares }))}
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
                  value={form.price}
                  onChangeText={price => setForm(prev => ({ ...prev, price, priceEdited: true }))}
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
                    if (!isEdit) setForm(initialFormState(undefined, false))
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
                  isDisabled={saving || !form.symbol}
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
