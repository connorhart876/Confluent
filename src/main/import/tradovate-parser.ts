import Papa from 'papaparse'
import {
  instruments,
  computePnl,
  deriveOutcome,
  type Instrument,
  type Direction,
  type Outcome
} from '../../shared/constants'

// ── Public types ────────────────────────────────────────────────────────────

export interface ParsedTrade {
  instrument: Instrument
  direction: Direction
  entryPrice: number
  exitPrice: number
  entryTime: string
  exitTime: string
  quantity: number
  pnl: number
  outcome: Outcome
}

export interface RowError {
  row: number
  raw: Record<string, string>
  reason: string
}

export interface ParseResult {
  trades: ParsedTrade[]
  errors: RowError[]
  summary: {
    totalRows: number
    pairedTrades: number
    errorCount: number
    unpaired: number
  }
}

// ── Internal types ──────────────────────────────────────────────────────────

interface NormalizedFill {
  action: 'Buy' | 'Sell'
  instrument: Instrument
  price: number
  quantity: number
  timestamp: string
  originalRow: number
}

// ── Column mapping ──────────────────────────────────────────────────────────

const COLUMN_ALIASES: Record<string, string> = {
  'b/s': 'action',
  'buy/sell': 'action',
  'side': 'action',
  'product': 'product',
  'contract': 'contract',
  'symbol': 'contract',
  'avgprice': 'price',
  'avg fill price': 'price',
  'fill price': 'price',
  'price': 'price',
  'filledqty': 'quantity',
  'filled qty': 'quantity',
  'qty': 'quantity',
  'fill time': 'timestamp',
  'timestamp': 'timestamp',
  'time': 'timestamp',
  'date/time': 'timestamp',
  'status': 'status'
}

const REQUIRED_COLUMNS = ['action', 'price', 'quantity', 'timestamp'] as const
const INSTRUMENT_COLUMN_CANDIDATES = ['product', 'contract'] as const

function normalizeHeaders(headers: string[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const raw of headers) {
    const key = raw.trim().toLowerCase()
    const mapped = COLUMN_ALIASES[key]
    if (mapped && !map.has(mapped)) {
      map.set(mapped, raw)
    }
  }
  return map
}

// ── Instrument parsing ──────────────────────────────────────────────────────

const FUTURES_MONTH_CODES = 'FGHJKMNQUVXZ'
const INSTRUMENT_BASES = ['MES', 'MNQ', 'ES', 'NQ'] as const

function parseInstrumentFromProduct(value: string): Instrument | null {
  const trimmed = value.trim().toUpperCase()
  if ((instruments as readonly string[]).includes(trimmed)) {
    return trimmed as Instrument
  }
  return null
}

function parseInstrumentFromContract(value: string): Instrument | null {
  const trimmed = value.trim().toUpperCase()
  for (const base of INSTRUMENT_BASES) {
    if (trimmed.startsWith(base)) {
      const suffix = trimmed.slice(base.length)
      if (
        suffix.length >= 2 &&
        FUTURES_MONTH_CODES.includes(suffix[0]) &&
        /^\d{1,2}$/.test(suffix.slice(1))
      ) {
        return base
      }
    }
  }
  return null
}

// ── Timestamp parsing ───────────────────────────────────────────────────────

function parseTradovateTimestamp(raw: string): string {
  const trimmed = raw.trim()
  const [datePart, timePart] = trimmed.split(' ')
  if (!datePart || !timePart) throw new Error(`Invalid timestamp: ${raw}`)

  const [month, day, year] = datePart.split('/')
  if (!month || !day || !year) throw new Error(`Invalid date: ${datePart}`)

  const local = new Date(
    `${year.padStart(4, '20')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${timePart}`
  )
  if (isNaN(local.getTime())) throw new Error(`Invalid timestamp: ${raw}`)
  return local.toISOString()
}

// ── Fill pairing (FIFO per instrument) ──────────────────────────────────────

interface FillQueue {
  fill: NormalizedFill
  remaining: number
}

function pairFills(fills: NormalizedFill[]): { trades: ParsedTrade[]; unpaired: number } {
  const byInstrument = new Map<Instrument, NormalizedFill[]>()
  for (const fill of fills) {
    const list = byInstrument.get(fill.instrument) ?? []
    list.push(fill)
    byInstrument.set(fill.instrument, list)
  }

  const trades: ParsedTrade[] = []
  let unpaired = 0

  for (const [, instrumentFills] of byInstrument) {
    instrumentFills.sort((a, b) => a.timestamp.localeCompare(b.timestamp))

    const openLongs: FillQueue[] = []
    const openShorts: FillQueue[] = []

    for (const fill of instrumentFills) {
      if (fill.action === 'Buy') {
        if (openShorts.length > 0) {
          let buyRemaining = fill.quantity
          while (buyRemaining > 0 && openShorts.length > 0) {
            const short = openShorts[0]
            const matchQty = Math.min(buyRemaining, short.remaining)

            const pnl = computePnl(
              fill.instrument,
              'Short',
              short.fill.price,
              fill.price,
              matchQty
            )
            trades.push({
              instrument: fill.instrument,
              direction: 'Short',
              entryPrice: short.fill.price,
              exitPrice: fill.price,
              entryTime: short.fill.timestamp,
              exitTime: fill.timestamp,
              quantity: matchQty,
              pnl,
              outcome: deriveOutcome(pnl)
            })

            short.remaining -= matchQty
            buyRemaining -= matchQty
            if (short.remaining === 0) openShorts.shift()
          }
          if (buyRemaining > 0) {
            openLongs.push({ fill, remaining: buyRemaining })
          }
        } else {
          openLongs.push({ fill, remaining: fill.quantity })
        }
      } else {
        if (openLongs.length > 0) {
          let sellRemaining = fill.quantity
          while (sellRemaining > 0 && openLongs.length > 0) {
            const long = openLongs[0]
            const matchQty = Math.min(sellRemaining, long.remaining)

            const pnl = computePnl(
              fill.instrument,
              'Long',
              long.fill.price,
              fill.price,
              matchQty
            )
            trades.push({
              instrument: fill.instrument,
              direction: 'Long',
              entryPrice: long.fill.price,
              exitPrice: fill.price,
              entryTime: long.fill.timestamp,
              exitTime: fill.timestamp,
              quantity: matchQty,
              pnl,
              outcome: deriveOutcome(pnl)
            })

            long.remaining -= matchQty
            sellRemaining -= matchQty
            if (long.remaining === 0) openLongs.shift()
          }
          if (sellRemaining > 0) {
            openShorts.push({ fill, remaining: sellRemaining })
          }
        } else {
          openShorts.push({ fill, remaining: fill.quantity })
        }
      }
    }

    for (const q of openLongs) unpaired += q.remaining
    for (const q of openShorts) unpaired += q.remaining
  }

  return { trades, unpaired }
}

// ── Main parser ─────────────────────────────────────────────────────────────

export function parseTradovateCsv(csv: string): ParseResult {
  const trimmed = csv.trim()
  if (!trimmed) {
    return { trades: [], errors: [], summary: { totalRows: 0, pairedTrades: 0, errorCount: 0, unpaired: 0 } }
  }

  const parsed = Papa.parse<Record<string, string>>(trimmed, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim()
  })

  if (!parsed.data.length) {
    return { trades: [], errors: [], summary: { totalRows: 0, pairedTrades: 0, errorCount: 0, unpaired: 0 } }
  }

  const headers = parsed.meta.fields ?? []
  const colMap = normalizeHeaders(headers)

  const missing: string[] = REQUIRED_COLUMNS.filter((c) => !colMap.has(c))
  const hasInstrumentCol = INSTRUMENT_COLUMN_CANDIDATES.some((c) => colMap.has(c))
  if (!hasInstrumentCol) missing.push('product or contract')
  if (missing.length > 0) {
    throw new Error(`Missing required CSV columns: ${missing.join(', ')}`)
  }

  const actionCol = colMap.get('action')!
  const productCol = colMap.get('product')
  const contractCol = colMap.get('contract')
  const priceCol = colMap.get('price')!
  const qtyCol = colMap.get('quantity')!
  const timestampCol = colMap.get('timestamp')!
  const statusCol = colMap.get('status')

  const fills: NormalizedFill[] = []
  const errors: RowError[] = []

  for (let i = 0; i < parsed.data.length; i++) {
    const row = parsed.data[i]
    const rowNum = i + 1

    if (statusCol) {
      const status = row[statusCol]?.trim()
      if (status && status !== 'Filled') continue
    }

    const rawAction = row[actionCol]?.trim()
    if (!rawAction) {
      errors.push({ row: rowNum, raw: row, reason: 'Missing B/S value' })
      continue
    }
    const actionUpper = rawAction.charAt(0).toUpperCase() + rawAction.slice(1).toLowerCase()
    if (actionUpper !== 'Buy' && actionUpper !== 'Sell') {
      errors.push({ row: rowNum, raw: row, reason: `Invalid B/S value: "${rawAction}"` })
      continue
    }

    let instrument: Instrument | null = null
    if (productCol && row[productCol]) {
      instrument = parseInstrumentFromProduct(row[productCol])
    }
    if (!instrument && contractCol && row[contractCol]) {
      instrument = parseInstrumentFromContract(row[contractCol])
    }
    if (!instrument) {
      const symbol = row[productCol ?? ''] || row[contractCol ?? ''] || '(empty)'
      errors.push({ row: rowNum, raw: row, reason: `Unsupported instrument: "${symbol}"` })
      continue
    }

    const rawPrice = row[priceCol]?.trim()
    if (!rawPrice) {
      errors.push({ row: rowNum, raw: row, reason: 'Missing fill price' })
      continue
    }
    const price = parseFloat(rawPrice)
    if (isNaN(price) || price <= 0) {
      errors.push({ row: rowNum, raw: row, reason: `Invalid fill price: "${rawPrice}"` })
      continue
    }

    const rawQty = row[qtyCol]?.trim()
    if (!rawQty) {
      errors.push({ row: rowNum, raw: row, reason: 'Missing fill quantity' })
      continue
    }
    const quantity = parseInt(rawQty, 10)
    if (isNaN(quantity) || quantity <= 0) {
      errors.push({ row: rowNum, raw: row, reason: `Invalid fill quantity: "${rawQty}"` })
      continue
    }

    const rawTimestamp = row[timestampCol]?.trim()
    if (!rawTimestamp) {
      errors.push({ row: rowNum, raw: row, reason: 'Missing fill time' })
      continue
    }
    let timestamp: string
    try {
      timestamp = parseTradovateTimestamp(rawTimestamp)
    } catch {
      errors.push({ row: rowNum, raw: row, reason: `Invalid fill time: "${rawTimestamp}"` })
      continue
    }

    fills.push({
      action: actionUpper as 'Buy' | 'Sell',
      instrument,
      price,
      quantity,
      timestamp,
      originalRow: rowNum
    })
  }

  const { trades, unpaired } = pairFills(fills)

  return {
    trades,
    errors,
    summary: {
      totalRows: parsed.data.length,
      pairedTrades: trades.length,
      errorCount: errors.length,
      unpaired
    }
  }
}
