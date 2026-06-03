import { z } from 'zod'

export const kbFormSchema = z.object({
  title: z.string().min(1, 'Enter a title'),
  content: z.string().min(1, 'Enter content'),
  category: z.string(),       // '__none__' sentinel or a KB_CATEGORIES value
  setupTypeIdStr: z.string()  // '__none__' sentinel or a numeric string
})

export type KbFormValues = z.infer<typeof kbFormSchema>
