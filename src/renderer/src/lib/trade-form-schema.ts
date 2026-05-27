import { z } from 'zod'
import { instruments, directions, sessions } from '@shared/constants'

export { instruments, directions, sessions } from '@shared/constants'
export { outcomes } from '@shared/constants'

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
  quantity: z
    .number({ required_error: 'Enter quantity', invalid_type_error: 'Must be a number' })
    .int('Must be a whole number')
    .positive('Must be at least 1'),
  notes: z.string().min(1, 'Enter notes')
})

export type TradeFormValues = z.infer<typeof tradeFormSchema>
