import { useEffect, useState } from 'react'
import type { ReactNode, RefObject } from 'react'
import { useForm } from 'react-hook-form'
import type { SetupType, StrategyRules, IpcResult } from '@shared/ipc-types'
import { Button } from '@renderer/components/ui/button'
import { Textarea } from '@renderer/components/ui/textarea'
import { Label } from '@renderer/components/ui/label'
import { toast } from '@renderer/components/ui/use-toast'

interface RulesFormValues {
  entryCriteria: string
  htfConfirmation: string
  validVsPremature: string
  sessionFilter: string
  freeformNotes: string
}

interface RulesEditorProps {
  setupType: SetupType
  initialRules: StrategyRules
  onDirtyChange: (dirty: boolean) => void
  onSaved: () => void
  formRef: RefObject<HTMLFormElement>
}

export function RulesEditor({
  setupType,
  initialRules,
  onDirtyChange,
  onSaved,
  formRef,
}: RulesEditorProps): JSX.Element {
  const [saving, setSaving] = useState(false)

  const { register, handleSubmit, reset, formState } = useForm<RulesFormValues>({
    defaultValues: {
      entryCriteria: initialRules.entryCriteria,
      htfConfirmation: initialRules.htfConfirmation,
      validVsPremature: initialRules.validVsPremature,
      sessionFilter: initialRules.sessionFilter,
      freeformNotes: initialRules.freeformNotes,
    },
  })

  useEffect(() => {
    onDirtyChange(formState.isDirty)
  }, [formState.isDirty, onDirtyChange])

  const onSubmit = async (values: RulesFormValues): Promise<void> => {
    setSaving(true)
    try {
      const result = (await window.api.strategyRules.upsert({
        setupTypeId: setupType.id,
        ...values,
      })) as IpcResult<StrategyRules>
      if (result.success) {
        reset({
          entryCriteria: result.data.entryCriteria,
          htfConfirmation: result.data.htfConfirmation,
          validVsPremature: result.data.validVsPremature,
          sessionFilter: result.data.sessionFilter,
          freeformNotes: result.data.freeformNotes,
        })
        toast({ title: 'Rules saved' })
        onSaved()
      } else {
        toast({ variant: 'destructive', title: 'Could not save rules', description: result.error })
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-b border-border px-6 py-4">
        <h2 className="text-base font-semibold">{setupType.name}</h2>
      </div>
      <form ref={formRef} className="flex-1 overflow-y-auto" onSubmit={handleSubmit(onSubmit)}>
        <div className="px-6 py-5">
          <div className="max-w-2xl space-y-5">
            <Field label="Entry Criteria" htmlFor="entryCriteria">
              <Textarea
                id="entryCriteria"
                rows={4}
                placeholder="Describe the conditions required to enter this trade..."
                {...register('entryCriteria')}
              />
            </Field>

            <Field label="HTF Confirmation" htmlFor="htfConfirmation">
              <Textarea
                id="htfConfirmation"
                rows={4}
                placeholder="What does the higher timeframe need to show?"
                {...register('htfConfirmation')}
              />
            </Field>

            <Field label="Valid vs. Premature Entry" htmlFor="validVsPremature">
              <Textarea
                id="validVsPremature"
                rows={4}
                placeholder="What distinguishes a valid entry from jumping in too early?"
                {...register('validVsPremature')}
              />
            </Field>

            <Field label="Session Filter" htmlFor="sessionFilter">
              <Textarea
                id="sessionFilter"
                rows={4}
                placeholder="Which sessions is this setup valid in, and why?"
                {...register('sessionFilter')}
              />
            </Field>

            <Field label="Notes" htmlFor="freeformNotes">
              <Textarea
                id="freeformNotes"
                rows={6}
                placeholder="Edge cases, hard no-trade conditions, personal reminders..."
                {...register('freeformNotes')}
              />
            </Field>

            <div className="flex justify-end pb-4 pt-2">
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save Rules'}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string
  htmlFor: string
  children: ReactNode
}): JSX.Element {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </Label>
      {children}
    </div>
  )
}
