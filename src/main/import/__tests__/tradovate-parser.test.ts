import { describe, it, expect } from 'vitest'
import { parseTradovateCsv, type ParseResult } from '../tradovate-parser'

const HEADERS =
  'orderId,Account,Order ID,B/S,Contract,Product,Product Description,avgPrice,filledQty,Fill Time,lastCommandId,Status,_priceFormat,_priceFormatType,_tickSize,spreadDefinitionId,Version ID,Timestamp,Date,Quantity,Text,Type,Limit Price,Stop Price,decimalLimit,decimalStop,Filled Qty,Avg Fill Price,decimalFillAvg,Venue,Notional Value,Currency'

function filledRow(overrides: {
  bs?: string
  contract?: string
  product?: string
  price?: string
  qty?: string
  fillTime?: string
}): string {
  const bs = overrides.bs ?? ' Buy'
  const contract = overrides.contract ?? 'MNQM6'
  const product = overrides.product ?? 'MNQ'
  const price = overrides.price ?? '29935.0'
  const qty = overrides.qty ?? '1'
  const fillTime = overrides.fillTime ?? '05/26/2026 07:45:00'
  return `100,ACCT,100,${bs},${contract},${product},Micro E-mini NASDAQ-100,${price},${qty},${fillTime},100, Filled,-2,0,0.25,,100,05/26/2026 07:45:00,5/26/26,${qty},Tradingview, Market,,,,,${qty},${price},${price},,\"419,090.00\",USD`
}

function canceledRow(): string {
  return '200,ACCT,200, Sell,MNQM6,MNQ,Micro E-mini NASDAQ-100,,,,200, Canceled,-2,0,0.25,,200,05/26/2026 07:45:16,5/26/26,7,Tradingview, Limit,29995.00,,29995.0,,,,,,,USD'
}

describe('parseTradovateCsv', () => {
  it('returns empty result for empty string', () => {
    const result = parseTradovateCsv('')
    expect(result.trades).toEqual([])
    expect(result.errors).toEqual([])
    expect(result.summary.totalRows).toBe(0)
  })

  it('returns empty result for headers only', () => {
    const result = parseTradovateCsv(HEADERS)
    expect(result.trades).toEqual([])
    expect(result.summary.totalRows).toBe(0)
  })

  it('throws on missing required columns', () => {
    expect(() => parseTradovateCsv('foo,bar,baz\n1,2,3')).toThrow('Missing required CSV columns')
  })

  it('skips canceled orders', () => {
    const csv = `${HEADERS}\n${canceledRow()}`
    const result = parseTradovateCsv(csv)
    expect(result.trades).toEqual([])
    expect(result.errors).toEqual([])
    expect(result.summary.unpaired).toBe(0)
  })

  it('pairs a simple Buy-Sell into a Long trade', () => {
    const buy = filledRow({ bs: ' Buy', price: '29935.0', qty: '1', fillTime: '05/26/2026 07:45:00' })
    const sell = filledRow({ bs: ' Sell', price: '29940.0', qty: '1', fillTime: '05/26/2026 07:50:00' })
    const csv = `${HEADERS}\n${buy}\n${sell}`

    const result = parseTradovateCsv(csv)
    expect(result.trades).toHaveLength(1)

    const trade = result.trades[0]
    expect(trade.instrument).toBe('MNQ')
    expect(trade.direction).toBe('Long')
    expect(trade.entryPrice).toBe(29935.0)
    expect(trade.exitPrice).toBe(29940.0)
    expect(trade.quantity).toBe(1)
    expect(trade.pnl).toBe(10.0) // (29940 - 29935) * $2/pt * 1
    expect(trade.outcome).toBe('Win')
  })

  it('pairs a Sell-Buy into a Short trade', () => {
    const sell = filledRow({ bs: ' Sell', price: '29940.0', qty: '1', fillTime: '05/26/2026 07:45:00' })
    const buy = filledRow({ bs: ' Buy', price: '29935.0', qty: '1', fillTime: '05/26/2026 07:50:00' })
    const csv = `${HEADERS}\n${sell}\n${buy}`

    const result = parseTradovateCsv(csv)
    expect(result.trades).toHaveLength(1)

    const trade = result.trades[0]
    expect(trade.direction).toBe('Short')
    expect(trade.entryPrice).toBe(29940.0)
    expect(trade.exitPrice).toBe(29935.0)
    expect(trade.pnl).toBe(10.0) // Short: (29940 - 29935) * $2 * 1
    expect(trade.outcome).toBe('Win')
  })

  it('computes losing trade correctly', () => {
    const buy = filledRow({ bs: ' Buy', price: '29940.0', qty: '1', fillTime: '05/26/2026 07:45:00' })
    const sell = filledRow({ bs: ' Sell', price: '29935.0', qty: '1', fillTime: '05/26/2026 07:50:00' })
    const csv = `${HEADERS}\n${buy}\n${sell}`

    const result = parseTradovateCsv(csv)
    expect(result.trades[0].pnl).toBe(-10.0)
    expect(result.trades[0].outcome).toBe('Loss')
  })

  it('computes breakeven trade correctly', () => {
    const buy = filledRow({ bs: ' Buy', price: '29935.0', qty: '1', fillTime: '05/26/2026 07:45:00' })
    const sell = filledRow({ bs: ' Sell', price: '29935.0', qty: '1', fillTime: '05/26/2026 07:50:00' })
    const csv = `${HEADERS}\n${buy}\n${sell}`

    const result = parseTradovateCsv(csv)
    expect(result.trades[0].pnl).toBe(0)
    expect(result.trades[0].outcome).toBe('Breakeven')
  })

  it('handles multi-contract trades', () => {
    const buy = filledRow({ bs: ' Buy', price: '29935.0', qty: '7', fillTime: '05/26/2026 07:45:00' })
    const sell = filledRow({ bs: ' Sell', price: '29935.5', qty: '7', fillTime: '05/26/2026 07:50:00' })
    const csv = `${HEADERS}\n${buy}\n${sell}`

    const result = parseTradovateCsv(csv)
    expect(result.trades).toHaveLength(1)
    expect(result.trades[0].quantity).toBe(7)
    expect(result.trades[0].pnl).toBe(7.0) // 0.5 * $2 * 7
  })

  it('handles partial quantity matching', () => {
    const buy = filledRow({ bs: ' Buy', price: '29935.0', qty: '3', fillTime: '05/26/2026 07:45:00' })
    const sell1 = filledRow({ bs: ' Sell', price: '29940.0', qty: '1', fillTime: '05/26/2026 07:50:00' })
    const sell2 = filledRow({ bs: ' Sell', price: '29945.0', qty: '2', fillTime: '05/26/2026 07:55:00' })
    const csv = `${HEADERS}\n${buy}\n${sell1}\n${sell2}`

    const result = parseTradovateCsv(csv)
    expect(result.trades).toHaveLength(2)

    expect(result.trades[0].quantity).toBe(1)
    expect(result.trades[0].pnl).toBe(10.0) // (29940-29935)*2*1

    expect(result.trades[1].quantity).toBe(2)
    expect(result.trades[1].pnl).toBe(40.0) // (29945-29935)*$2/pt*2
  })

  it('reports unpaired fills', () => {
    const buy = filledRow({ bs: ' Buy', price: '29935.0', qty: '1', fillTime: '05/26/2026 07:45:00' })
    const csv = `${HEADERS}\n${buy}`

    const result = parseTradovateCsv(csv)
    expect(result.trades).toHaveLength(0)
    expect(result.summary.unpaired).toBe(1)
  })

  it('reports error for unsupported instrument', () => {
    const row = filledRow({ product: 'CL', contract: 'CLM6' })
    const csv = `${HEADERS}\n${row}`

    const result = parseTradovateCsv(csv)
    expect(result.trades).toHaveLength(0)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].reason).toContain('Unsupported instrument')
  })

  it('reports error for invalid price', () => {
    const row = filledRow({ price: 'abc' })
    const csv = `${HEADERS}\n${row}`

    const result = parseTradovateCsv(csv)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].reason).toContain('Invalid fill price')
  })

  it('reports error for invalid timestamp', () => {
    const row = filledRow({ fillTime: 'not-a-date' })
    const csv = `${HEADERS}\n${row}`

    const result = parseTradovateCsv(csv)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].reason).toContain('Invalid fill time')
  })

  it('maps ES instrument correctly', () => {
    const buy = filledRow({ bs: ' Buy', product: 'ES', contract: 'ESM6', price: '5400.0', qty: '1', fillTime: '05/26/2026 07:45:00' })
    const sell = filledRow({ bs: ' Sell', product: 'ES', contract: 'ESM6', price: '5401.0', qty: '1', fillTime: '05/26/2026 07:50:00' })
    const csv = `${HEADERS}\n${buy}\n${sell}`

    const result = parseTradovateCsv(csv)
    expect(result.trades[0].instrument).toBe('ES')
    expect(result.trades[0].pnl).toBe(50.0) // 1pt * $50/pt * 1
  })

  it('maps NQ instrument correctly', () => {
    const buy = filledRow({ bs: ' Buy', product: 'NQ', contract: 'NQM6', price: '19000.0', qty: '1', fillTime: '05/26/2026 07:45:00' })
    const sell = filledRow({ bs: ' Sell', product: 'NQ', contract: 'NQM6', price: '19001.0', qty: '1', fillTime: '05/26/2026 07:50:00' })
    const csv = `${HEADERS}\n${buy}\n${sell}`

    const result = parseTradovateCsv(csv)
    expect(result.trades[0].instrument).toBe('NQ')
    expect(result.trades[0].pnl).toBe(20.0) // 1pt * $20/pt * 1
  })

  it('maps MES instrument correctly', () => {
    const buy = filledRow({ bs: ' Buy', product: 'MES', contract: 'MESH6', price: '5400.0', qty: '2', fillTime: '05/26/2026 07:45:00' })
    const sell = filledRow({ bs: ' Sell', product: 'MES', contract: 'MESH6', price: '5402.0', qty: '2', fillTime: '05/26/2026 07:50:00' })
    const csv = `${HEADERS}\n${buy}\n${sell}`

    const result = parseTradovateCsv(csv)
    expect(result.trades[0].instrument).toBe('MES')
    expect(result.trades[0].pnl).toBe(20.0) // 2pt * $5/pt * 2
  })

  it('trims leading spaces from B/S values', () => {
    const buy = filledRow({ bs: ' Buy' })
    const sell = filledRow({ bs: ' Sell', fillTime: '05/26/2026 07:50:00' })
    const csv = `${HEADERS}\n${buy}\n${sell}`

    const result = parseTradovateCsv(csv)
    expect(result.trades).toHaveLength(1)
  })

  it('parses the real Tradovate CSV sample correctly', () => {
    const csv = `orderId,Account,Order ID,B/S,Contract,Product,Product Description,avgPrice,filledQty,Fill Time,lastCommandId,Status,_priceFormat,_priceFormatType,_tickSize,spreadDefinitionId,Version ID,Timestamp,Date,Quantity,Text,Type,Limit Price,Stop Price,decimalLimit,decimalStop,Filled Qty,Avg Fill Price,decimalFillAvg,Venue,Notional Value,Currency
500074870357,APEX4422040000007,500074870357, Buy,MNQM6,MNQ,Micro E-mini NASDAQ-100,29935.0,7,05/26/2026 07:45:00,500074870357, Filled,-2,0,0.25,,500074870357,05/26/2026 07:45:00,5/26/26,7,Tradingview, Market,,,,,7,29935.00,29935.0,,"419,090.00",USD
500074870364,APEX4422040000007,500074870364, Sell,MNQM6,MNQ,Micro E-mini NASDAQ-100,,,,500074870388, Canceled,-2,0,0.25,,500074870388,05/26/2026 07:45:16,5/26/26,7,Tradingview, Limit,29995.00,,29995.0,,,,,,,USD
500074870366,APEX4422040000007,500074870366, Sell,MNQM6,MNQ,Micro E-mini NASDAQ-100,29935.5,7,05/26/2026 07:50:47,500074870398, Filled,-2,0,0.25,,500074870398,05/26/2026 07:47:14,5/26/26,7,Tradingview, Stop,,29935.50,,29935.5,7,29935.50,29935.5,,"419,097.00",USD
500074870380,APEX4422040000007,500074870380, Buy,MNQM6,MNQ,Micro E-mini NASDAQ-100,29940.5,1,05/26/2026 07:45:11,500074870380, Filled,-2,0,0.25,,500074870380,05/26/2026 07:45:11,5/26/26,1,Tradingview, Market,,,,,1,29940.50,29940.5,,"59,881.00",USD
500074870395,APEX4422040000007,500074870395, Sell,MNQM6,MNQ,Micro E-mini NASDAQ-100,,,,500074870395, Canceled,-2,0,0.25,,500074870395,05/26/2026 07:45:29,5/26/26,8,Tradingview, Limit,29995.25,,29995.25,,,,,,,USD
500074870410,APEX4422040000007,500074870410, Sell,MNQM6,MNQ,Micro E-mini NASDAQ-100,29937.25,1,05/26/2026 07:50:52,500074870410, Filled,-2,0,0.25,,500074870410,05/26/2026 07:50:52,5/26/26,1,Exit, Market,,,,,1,29937.25,29937.25,,"59,874.50",USD
500074870419,APEX4422040000007,500074870419, Buy,MNQM6,MNQ,Micro E-mini NASDAQ-100,29958.25,11,05/26/2026 07:54:31,500074870419, Filled,-2,0,0.25,,500074870419,05/26/2026 07:54:31,5/26/26,11,Tradingview, Market,,,,,11,29958.25,29958.25,,"659,081.50",USD
500074870425,APEX4422040000007,500074870425, Sell,MNQM6,MNQ,Micro E-mini NASDAQ-100,,,,500074870449, Canceled,-2,0,0.25,,500074870449,05/26/2026 07:56:21,5/26/26,11,Tradingview, Limit,29995.50,,29995.5,,,,,,,USD
500074870427,APEX4422040000007,500074870427, Sell,MNQM6,MNQ,Micro E-mini NASDAQ-100,,,,500074870441, Canceled,-2,0,0.25,,500074870441,05/26/2026 07:56:05,5/26/26,11,Tradingview, Stop,,29958.25,,29958.25,,,,,,USD
500074870459,APEX4422040000007,500074870459, Sell,MNQM6,MNQ,Micro E-mini NASDAQ-100,29988.0,11,05/26/2026 07:58:14,500074870459, Filled,-2,0,0.25,,500074870459,05/26/2026 07:58:14,5/26/26,11,Exit, Market,,,,,11,29988.00,29988.0,,"659,736.00",USD`

    const result: ParseResult = parseTradovateCsv(csv)

    expect(result.errors).toEqual([])
    expect(result.summary.totalRows).toBe(10)
    expect(result.summary.unpaired).toBe(0)
    expect(result.trades).toHaveLength(3)

    // Trade 1: Buy 7 @ 29935.0 → Sell 7 @ 29935.5 (Long)
    expect(result.trades[0].direction).toBe('Long')
    expect(result.trades[0].entryPrice).toBe(29935.0)
    expect(result.trades[0].exitPrice).toBe(29935.5)
    expect(result.trades[0].quantity).toBe(7)
    expect(result.trades[0].pnl).toBe(7.0) // 0.5 * $2 * 7
    expect(result.trades[0].outcome).toBe('Win')

    // Trade 2: Buy 1 @ 29940.5 → Sell 1 @ 29937.25 (Long)
    expect(result.trades[1].direction).toBe('Long')
    expect(result.trades[1].entryPrice).toBe(29940.5)
    expect(result.trades[1].exitPrice).toBe(29937.25)
    expect(result.trades[1].quantity).toBe(1)
    expect(result.trades[1].pnl).toBe(-6.5) // -3.25 * $2 * 1
    expect(result.trades[1].outcome).toBe('Loss')

    // Trade 3: Buy 11 @ 29958.25 → Sell 11 @ 29988.0 (Long)
    expect(result.trades[2].direction).toBe('Long')
    expect(result.trades[2].entryPrice).toBe(29958.25)
    expect(result.trades[2].exitPrice).toBe(29988.0)
    expect(result.trades[2].quantity).toBe(11)
    expect(result.trades[2].pnl).toBe(654.5) // 29.75 * $2 * 11
    expect(result.trades[2].outcome).toBe('Win')
  })
})
