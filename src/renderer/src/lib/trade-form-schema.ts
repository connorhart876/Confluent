import { z } from 'zod'

export const instruments = ['ES', 'NQ', 'MES', 'MNQ'] as const
export const directions = ['Long', 'Short'] as const
export const sessions = ['NY AM', 'Asian'] as const
export const outcomes = ['Win', 'Loss', 'Breakeven'] as const

export const tradeFormSchema = z.object({
  instrument: z.enum(instruments, { required_error: 'Select an instrument' }),
  direction: z.enum(directions, { required_error: 'Select a direction' }),
  entryPrice: z
    .number({ required_error: 'Enter entry price', invalid_type_error: 'Must be a number' })
    .positive('Must be positive'),
  exitPrice: z
    .number({ required_error: 'Enter exit price', invalid_type_error: 'Must be a number' })
    .positive('Must be positive'),
  entryTime: z.string().min(1, 'Select entry time'),
  exitTime: z.string().min(1, 'Select exit time'),
  session: z.enum(sessions, { required_error: 'Select a session' }),
  setupTypeId: z
    .number({ required_error: 'Select a setup type', invalid_type_error: 'Select a setup type' })
    .int()
    .positive('Select a setup type'),
  outcome: z.enum(outcomes, { required_error: 'Select an outcome' }),
  pnl: z.number({ required_error: 'Enter P&L', invalid_type_error: 'Must be a number' }),
  notes: z.string().min(1, 'Enter notes')
})

export type TradeFormValues = z.infer<typeof tradeFormSchema>
