export const KB_CATEGORIES = [
  'HTF Bias & Draw on Liquidity',
  'Session Context',
  'The Three Models',
  'Entry Criteria & IFVG Rules',
  'Hard No-Trade Rules',
  'Stop Loss & Invalidation Logic',
  'Take Profit & Trade Management',
  'Session Management & Re-Entry Rules',
  'Known Mistakes & Patterns'
] as const

export type KbCategory = (typeof KB_CATEGORIES)[number]

export const instruments = ['ES', 'NQ', 'MES', 'MNQ'] as const
export const directions = ['Long', 'Short'] as const
export const sessions = ['NY AM', 'Asian'] as const
export const outcomes = ['Win', 'Loss', 'Breakeven'] as const

export type Instrument = (typeof instruments)[number]
export type Direction = (typeof directions)[number]
export type Outcome = (typeof outcomes)[number]

export const DOLLAR_PER_POINT: Record<Instrument, number> = {
  ES: 50,
  NQ: 20,
  MES: 5,
  MNQ: 2
}

export function computePnl(
  instrument: Instrument,
  direction: Direction,
  entryPrice: number,
  exitPrice: number,
  quantity: number
): number {
  const raw = (exitPrice - entryPrice) * DOLLAR_PER_POINT[instrument] * quantity
  return direction === 'Long' ? raw : -raw
}

export function deriveOutcome(pnl: number): Outcome {
  if (pnl > 0) return 'Win'
  if (pnl < 0) return 'Loss'
  return 'Breakeven'
}
