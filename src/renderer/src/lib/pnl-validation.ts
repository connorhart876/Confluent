export type PnlWarning =
  | { type: 'sign-mismatch'; message: string }
  | { type: 'zero-check'; message: string }
  | null

export function checkPnlSign(
  direction: 'Long' | 'Short',
  entryPrice: number,
  exitPrice: number,
  pnl: number
): PnlWarning {
  if (pnl === 0) return null
  const diff = exitPrice - entryPrice
  if (diff === 0) return null

  const expectPositive = direction === 'Long' ? diff > 0 : diff < 0

  if (expectPositive && pnl < 0) {
    return {
      type: 'sign-mismatch',
      message: `${direction} trade with a favorable price move — expected positive P&L but got negative. Proceed anyway?`
    }
  }
  if (!expectPositive && pnl > 0) {
    return {
      type: 'sign-mismatch',
      message: `${direction} trade with an unfavorable price move — expected negative P&L but got positive. Proceed anyway?`
    }
  }
  return null
}

export function checkPnlZero(pnl: number, outcome: 'Win' | 'Loss' | 'Breakeven'): PnlWarning {
  if (pnl === 0 && (outcome === 'Win' || outcome === 'Loss')) {
    return {
      type: 'zero-check',
      message: `P&L is $0.00 but outcome is "${outcome}". Did you mean Breakeven?`
    }
  }
  return null
}
