import { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Card } from 'heroui-native/card'
import { Button } from 'heroui-native/button'
import { Input } from 'heroui-native/input'
import { Dialog } from 'heroui-native/dialog'
import { ArrowLeft, Plus, TrendingUp, TrendingDown, Trash2 } from 'lucide-react-native'
import { useBrokers } from '../../../hooks/useBrokers'
import { usePositions } from '../../../hooks/usePositions'
import { usePrices } from '../../../hooks/usePrices'
import { getQuote, searchSymbols } from '../../../lib/yahooFinance'
import { getExchangeRates, toEur, convertToDisplay, formatAmount } from '../../../lib/currency'
import { useSettings } from '../../../lib/settingsContext'
import { useT } from '../../../lib/t'
import type { PositionWithPrice } from '../../../types'

export default function BrokerDetailScreen() {
  const { _ } = useT()
  const { currency: displayCurrency } = useSettings()
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { brokers } = useBrokers()
  const { positions, loading, addPosition, deletePosition } = usePositions(id)
  const { fetchPrices: fetchPricesFromHook } = usePrices()
  const broker = brokers.find(b => b.id === id)

  const [positionsWithPrices, setPositionsWithPrices] = useState<PositionWithPrice[]>([])
  const [pricesLoading, setPricesLoading] = useState(false)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<
    Array<{ symbol: string; name: string; exchange: string; type: string }>
  >([])
  const [searching, setSearching] = useState(false)
  const [selectedSymbol, setSelectedSymbol] = useState('')
  const [selectedName, setSelectedName] = useState('')
  const [selectedCurrency, setSelectedCurrency] = useState('USD')
  const [shares, setShares] = useState('')
  const [price, setPrice] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchPrices = useCallback(async () => {
    if (positions.length === 0) {
      setPositionsWithPrices([])
      return
    }
    setPricesLoading(true)
    try {
      const rates = await getExchangeRates()
      const symbols = [...new Set(positions.map(p => p.symbol))]
      const prices = await fetchPricesFromHook(symbols)

      const withPrices: PositionWithPrice[] = positions.map(pos => {
        const quote = prices[pos.symbol]
        const rawPrice = quote?.price ?? pos.avg_buy_price
        const currency = quote?.currency ?? pos.currency
        const valueEur = toEur(pos.shares * rawPrice, currency, rates)
        const costEur = toEur(pos.shares * pos.avg_buy_price, pos.currency, rates)
        const currentValue = convertToDisplay(valueEur, displayCurrency, rates)
        const invested = convertToDisplay(costEur, displayCurrency, rates)
        const gainLoss = currentValue - invested
        const gainLossPct = invested > 0 ? (gainLoss / invested) * 100 : 0
        return {
          id: pos.id,
          broker_id: pos.broker_id,
          user_id: pos.user_id,
          symbol: pos.symbol,
          name: pos.name,
          shares: pos.shares,
          avg_buy_price: pos.avg_buy_price,
          currency,
          currentPrice: rawPrice,
          currentValue,
          invested,
          gainLoss,
          gainLossPct,
        }
      })
      setPositionsWithPrices(withPrices)
    } catch {
      // fall back to avg_buy_price display
    } finally {
      setPricesLoading(false)
    }
  }, [positions, fetchPricesFromHook, displayCurrency])

  useEffect(() => {
    fetchPrices()
  }, [fetchPrices])

  const handleSearch = async (query: string) => {
    setSearchQuery(query)
    if (query.length < 2) {
      setSearchResults([])
      return
    }
    setSearching(true)
    const results = await searchSymbols(query)
    setSearchResults(results)
    setSearching(false)
  }

  const handleSelectSymbol = async (symbol: string, name: string) => {
    setSelectedSymbol(symbol)
    setSelectedName(name)
    setSearchResults([])
    setSearchQuery(name)
    const quote = await getQuote(symbol)
    if (quote) {
      setPrice(quote.price.toFixed(2))
      setSelectedCurrency(quote.currency)
    }
  }

  const handleAddPosition = async () => {
    if (!selectedSymbol) return Alert.alert(_('error'), _('selectSymbol'))
    if (!shares || parseFloat(shares) <= 0) return Alert.alert(_('error'), _('enterShares'))
    if (!price || parseFloat(price) <= 0) return Alert.alert(_('error'), _('enterPrice'))
    setSaving(true)
    const { error } = await addPosition({
      broker_id: id!,
      symbol: selectedSymbol,
      name: selectedName,
      shares: parseFloat(shares),
      avg_buy_price: parseFloat(price),
      currency: selectedCurrency,
    })
    setSaving(false)
    if (error) return Alert.alert(_('error'), typeof error === 'string' ? error : error.message)
    resetDialog()
    setDialogOpen(false)
  }

  const handleDeletePosition = (posId: string, symbol: string) => {
    Alert.alert(_('deletePosition'), _('deletePositionMsg', { symbol }), [
      { text: _('cancel'), style: 'cancel' },
      {
        text: _('delete'),
        style: 'destructive',
        onPress: async () => {
          const { error } = await deletePosition(posId)
          if (error) Alert.alert(_('error'), typeof error === 'string' ? error : error.message)
        },
      },
    ])
  }

  const resetDialog = () => {
    setSearchQuery('')
    setSearchResults([])
    setSelectedSymbol('')
    setSelectedName('')
    setShares('')
    setPrice('')
    setSelectedCurrency('USD')
  }

  const totalValue = positionsWithPrices.reduce((s, p) => s + p.currentValue, 0)
  const totalInvested = positionsWithPrices.reduce((s, p) => s + p.invested, 0)
  const totalGL = totalValue - totalInvested
  const totalGLPct = totalInvested > 0 ? (totalGL / totalInvested) * 100 : 0
  const isPositive = totalGL >= 0

  if (!id || !broker) {
    return (
      <SafeAreaView className="flex-1 bg-background justify-center items-center">
        <Text className="text-muted">{_('brokerNotFound')}</Text>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-5 pt-2 pb-4 flex-row items-center gap-3">
        <Button variant="ghost" size="sm" isIconOnly onPress={() => router.back()}>
          <ArrowLeft color="#fafafa" size={20} />
        </Button>
        <View className="w-3 h-3 rounded-full" style={{ backgroundColor: broker.color }} />
        <Text className="text-foreground text-2xl font-bold flex-1">{broker.name}</Text>
        <Button variant="primary" size="sm" onPress={() => setDialogOpen(true)}>
          <Plus color="#fafafa" size={16} />
          <Button.Label>{_('position')}</Button.Label>
        </Button>
      </View>

      <View className="px-5 mb-4">
        <Card className="bg-surface p-5">
          <Text className="text-muted text-sm mb-1">{_('totalValueLabel')}</Text>
          <Text className="text-foreground text-3xl font-bold mb-1">
            {formatAmount(totalValue, displayCurrency)}
          </Text>
          <View className="flex-row items-center gap-2">
            {isPositive ? (
              <TrendingUp size={14} color="#17c964" />
            ) : (
              <TrendingDown size={14} color="#f31260" />
            )}
            <Text
              className={
                isPositive
                  ? 'text-success text-sm font-semibold'
                  : 'text-danger text-sm font-semibold'
              }
            >
              {isPositive ? '+' : ''}
              {formatAmount(totalGL, displayCurrency)} ({isPositive ? '+' : ''}
              {totalGLPct.toFixed(2)}%)
            </Text>
          </View>
        </Card>
      </View>

      {loading || pricesLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#006fee" />
        </View>
      ) : positionsWithPrices.length === 0 ? (
        <View className="flex-1 justify-center items-center">
          <Text className="text-foreground text-lg mb-2">{_('noPositions')}</Text>
          <Text className="text-muted text-sm">{_('addFirstPosition')}</Text>
        </View>
      ) : (
        <FlatList
          data={positionsWithPrices}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={pricesLoading} onRefresh={fetchPrices} />}
          renderItem={({ item }) => {
            const pos = item.gainLoss >= 0
            return (
              <Card className="bg-surface p-4 mb-2">
                <View className="flex-row items-center">
                  <View className="flex-1">
                    <Text className="text-foreground font-semibold text-base">{item.symbol}</Text>
                    <Text className="text-muted text-xs">{item.name}</Text>
                    <Text className="text-muted text-xs mt-1">
                      {item.shares} ks × {formatAmount(item.avg_buy_price, displayCurrency)}
                    </Text>
                  </View>
                  <View className="items-end mr-3">
                    <Text className="text-foreground font-semibold">
                      {formatAmount(item.currentValue, displayCurrency)}
                    </Text>
                    <Text
                      className={
                        pos ? 'text-success text-xs font-medium' : 'text-danger text-xs font-medium'
                      }
                    >
                      {pos ? '+' : ''}
                      {formatAmount(item.gainLoss, displayCurrency)} ({pos ? '+' : ''}
                      {item.gainLossPct.toFixed(2)}%)
                    </Text>
                    <Text className="text-muted text-xs">
                      {formatAmount(item.currentPrice, displayCurrency)}
                    </Text>
                  </View>
                  <Button
                    variant="ghost"
                    size="sm"
                    isIconOnly
                    onPress={() => handleDeletePosition(item.id, item.symbol)}
                  >
                    <Trash2 color="#f31260" size={16} />
                  </Button>
                </View>
              </Card>
            )
          }}
        />
      )}

      <Dialog
        isOpen={dialogOpen}
        onOpenChange={open => {
          if (!open) resetDialog()
          setDialogOpen(open)
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
                  {searching && <ActivityIndicator size="small" color="#006fee" />}
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
                      resetDialog()
                      setDialogOpen(false)
                    }}
                  >
                    <Button.Label>{_('cancel')}</Button.Label>
                  </Button>
                </View>
                <View className="flex-1">
                  <Button
                    variant="primary"
                    size="lg"
                    onPress={handleAddPosition}
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
    </SafeAreaView>
  )
}
