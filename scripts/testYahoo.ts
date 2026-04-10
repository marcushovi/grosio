import { getQuote, searchSymbols } from '../lib/yahooFinance'

async function test() {
  console.log('=== Testing Yahoo Finance ===')

  console.log('\n1. Search "AAPL":')
  const results = await searchSymbols('AAPL')
  console.log(JSON.stringify(results.slice(0, 3), null, 2))

  console.log('\n2. Search "VWCE":')
  const etfResults = await searchSymbols('VWCE')
  console.log(JSON.stringify(etfResults.slice(0, 3), null, 2))

  console.log('\n3. Quote AAPL:')
  const appleQuote = await getQuote('AAPL')
  console.log(JSON.stringify(appleQuote, null, 2))

  console.log('\n4. Quote VWCE.DE:')
  const vwceQuote = await getQuote('VWCE.DE')
  console.log(JSON.stringify(vwceQuote, null, 2))

  console.log('\n5. Quote SPY:')
  const spyQuote = await getQuote('SPY')
  console.log(JSON.stringify(spyQuote, null, 2))
}

test().catch(console.error)
