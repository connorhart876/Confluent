import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { SetupType, Trade, IpcResult } from '@shared/ipc-types'
import {
  tradeFormSchema,
  type TradeFormValues,
  instruments,
  directions,
  sessions
} from '@renderer/lib/trade-form-schema'
import { useTradeFormStore } from '@renderer/stores/trade-form-store'
import { toast } from '@renderer/components/ui/use-toast'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@renderer/components/ui/form'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { Textarea } from '@renderer/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@renderer/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@renderer/components/ui/toggle-group'
import { ScreenshotAttach } from './screenshot-attach'
import { useNavigationStore } from '@renderer/stores/navigation-store'

interface TradeEntryFormProps {
  setupTypes: SetupType[]
}

export function TradeEntryForm({ setupTypes }: TradeEntryFormProps): JSX.Element {
  const { lastInstrument, lastSession, setLastValues } = useTradeFormStore()
  const setPage = useNavigationStore((s) => s.setPage)

  const [screenshot, setScreenshot] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const form = useForm<TradeFormValues>({
    resolver: zodResolver(tradeFormSchema),
    defaultValues: {
      instrument: (lastInstrument as TradeFormValues['instrument']) ?? undefined,
      session: (lastSession as TradeFormValues['session']) ?? undefined,
      quantity: 1
    }
  })

  const doSubmit = async (values: TradeFormValues, logAnother: boolean): Promise<void> => {
    setSubmitting(true)
    try {
      const toIso = (local: string): string => new Date(local).toISOString()
      const payload = {
        instrument: values.instrument,
        direction: values.direction,
        entryPrice: values.entryPrice,
        exitPrice: values.exitPrice,
        entryTime: toIso(values.entryTime),
        exitTime: toIso(values.exitTime),
        session: values.session,
        setupTypeId: values.setupTypeId,
        quantity: values.quantity,
        notes: values.notes,
        screenshotPath: null,
        ...(screenshot ? { screenshotData: screenshot } : {})
      }

      const result = await window.api.trade.create(payload) as IpcResult<Trade>

      if (!result.success) {
        toast({ variant: 'destructive', title: 'Save failed', description: result.error })
        return
      }

      toast({ title: 'Trade saved' })

      if (logAnother) {
        setLastValues(values.instrument, values.session)
        setScreenshot(null)
        form.reset({
          instrument: values.instrument as TradeFormValues['instrument'],
          session: values.session as TradeFormValues['session'],
          quantity: 1
        })
      } else {
        setPage('dashboard')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleSave = form.handleSubmit((values) => {
    void doSubmit(values, false)
  })

  const handleLogAnother = form.handleSubmit((values) => {
    void doSubmit(values, true)
  })

  return (
    <Form {...form}>
      <form className="space-y-5">
        {/* Row 1: Instrument | Direction | Session */}
        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="instrument"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Instrument</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select…" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {instruments.map((i) => (
                      <SelectItem key={i} value={i}>{i}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="direction"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Direction</FormLabel>
                <FormControl>
                  <ToggleGroup
                    type="single"
                    value={field.value}
                    onValueChange={(v) => { if (v) field.onChange(v) }}
                    variant="outline"
                    className="justify-start"
                  >
                    {directions.map((d) => (
                      <ToggleGroupItem key={d} value={d} className="flex-1">
                        {d}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="session"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Session</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select…" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {sessions.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Row 2: Entry Price | Exit Price | Quantity */}
        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="entryPrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Entry Price</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.25"
                    placeholder="e.g. 5423.75"
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="exitPrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Exit Price</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.25"
                    placeholder="e.g. 5430.00"
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contracts</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="1"
                    min="1"
                    placeholder="1"
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value === '' ? undefined : parseInt(e.target.value, 10))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Row 3: Entry Time | Exit Time */}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="entryTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Entry Time</FormLabel>
                <FormControl>
                  <Input type="datetime-local" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="exitTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Exit Time</FormLabel>
                <FormControl>
                  <Input type="datetime-local" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Row 4: Setup Type */}
        <FormField
          control={form.control}
          name="setupTypeId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Setup Type</FormLabel>
              {setupTypes.length === 0 ? (
                <div className="flex items-center gap-2 rounded-md border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">
                  No setup types defined.{' '}
                  <button
                    type="button"
                    className="text-primary underline hover:no-underline"
                    onClick={() => setPage('settings')}
                  >
                    Add one in Settings
                  </button>
                </div>
              ) : (
                <Select
                  onValueChange={(v) => field.onChange(parseInt(v, 10))}
                  value={field.value ? String(field.value) : undefined}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select setup type…" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {setupTypes.map((st) => (
                      <SelectItem key={st.id} value={String(st.id)}>
                        {st.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Row 5: Notes */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Context, observations, mistakes…"
                  className="min-h-[100px] resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Row 6: Screenshot */}
        <div className="space-y-2">
          <label className="text-sm font-medium leading-none text-foreground">
            Chart Screenshot
          </label>
          <ScreenshotAttach value={screenshot} onChange={setScreenshot} />
        </div>

        {/* Row 7: Submit */}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" disabled={submitting} onClick={handleLogAnother}>
            {submitting ? 'Saving…' : 'Log another'}
          </Button>
          <Button type="button" disabled={submitting} onClick={handleSave} className="min-w-[120px]">
            {submitting ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
