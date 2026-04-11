import { useState, useCallback } from 'react'
import { View, Text, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native'
import { Button } from 'heroui-native/button'
import { Input } from 'heroui-native/input'
import { Dialog } from 'heroui-native/dialog'
import { useThemeColor } from 'heroui-native'
import { getQuote, searchSymbols } from '../lib/yahooFinance'
import { useT } from '../lib/t'

interface SearchResult {
  symbol: string
  name: string
  exchange: string
  type: string
}

interface AddPositionDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (position: {
    symbol: string
    name: string
    shares: number
    avg_buy_price: number
    currency: string
  }) => Promise<{ error: { message: string } | null }>
}

export function AddPositionDialog({ isOpen, onOpenChange, onAdd }: AddPositionDialogProps) {
  const { _ } = useT()
  const accent = useThemeColor('accent') as string

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedSymbol, setSelectedSymbol] = useState('')
  const [selectedName, setSelectedName] = useState('')
  const [selectedCurrency, setSelectedCurrency] = useState('USD')
  const [shares, setShares] = useState('')
  const [price, setPrice] = useState('')
  const [saving, setSaving] = useState(false)

  const reset = useCallback(() => {
    setSearchQuery('')
    setSearchResults([])
    setSelectedSymbol('')
    setSelectedName('')
    setShares('')
    setPrice('')
    setSelectedCurrency('USD')
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

  const handleSelectSymbol = useCallback(async (symbol: string, name: string) => {
    setSelectedSymbol(symbol)
    setSelectedName(name)
    setSearchResults([])
    setSearchQuery(name)
    try {
      const quote = await getQuote(symbol)
      if (quote) {
        setPrice(quote.price.toFixed(2))
        setSelectedCurrency(quote.currency)
      }
    } catch {
      // keep defaults if quote fetch fails
    }
  }, [])

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
    })
    setSaving(false)
    if (error) return Alert.alert(_('error'), error.message)
    reset()
    onOpenChange(false)
  }, [selectedSymbol, selectedName, shares, price, selectedCurrency, onAdd, reset, onOpenChange, _])

  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={open => {
        if (!open) reset()
        onOpenChange(open)
      }}
    >
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
              <View className="flex-row items-center gap-2">
                <View className="flex-1">
                  <Input
                    placeholder={_('searchPlaceholder')}
                    value={searchQuery}
                    onChangeText={handleSearch}
                    autoCapitalize="characters"
                  />
                </View>
                {searching && <ActivityIndicator size="small" color={accent} />}
              </View>
            </View>

            {searchResults.length > 0 && (
              <View className="mt-2 max-h-40">
                {searchResults.slice(0, 5).map(r => (
                  <Button
                    key={r.symbol}
                    variant="ghost"
                    size="sm"
                    onPress={() => handleSelectSymbol(r.symbol, r.name)}
                    className="justify-start mb-1"
                  >
                    <Button.Label>
                      {r.symbol} — {r.name}
                    </Button.Label>
                  </Button>
                ))}
              </View>
            )}

            {selectedSymbol ? (
              <View className="mt-3 bg-background rounded-xl p-3">
                <Text className="text-accent font-semibold">{selectedSymbol}</Text>
                <Text className="text-muted text-xs">{selectedName}</Text>
              </View>
            ) : null}

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
                <Text className="text-muted text-sm mb-2">{_('buyPrice')}</Text>
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
