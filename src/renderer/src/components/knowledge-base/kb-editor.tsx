import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { ArrowLeft } from 'lucide-react'
import type { KnowledgeBaseEntry, SetupType, IpcResult } from '@shared/ipc-types'
import { KB_CATEGORIES } from '@shared/constants'
import { kbFormSchema, type KbFormValues } from '@renderer/lib/kb-form-schema'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { Textarea } from '@renderer/components/ui/textarea'
import { Label } from '@renderer/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@renderer/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@renderer/components/ui/dialog'
import { toast } from '@renderer/components/ui/use-toast'
import { KbDeleteDialog } from './kb-delete-dialog'

interface KbEditorProps {
  entryId: number | null
  initialEntry: KnowledgeBaseEntry | null
  setupTypes: SetupType[]
  onBack: () => void
  onSaved: () => void
  onDeleted: () => void
}

export function KbEditor({
  entryId,
  initialEntry,
  setupTypes,
  onBack,
  onSaved,
  onDeleted
}: KbEditorProps): JSX.Element {
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showDiscardDialog, setShowDiscardDialog] = useState(false)

  const defaultValues: KbFormValues = {
    title: initialEntry?.title ?? '',
    content: initialEntry?.content ?? '',
    category: initialEntry?.category ?? '__none__',
    setupTypeIdStr: initialEntry?.setupTypeId != null ? String(initialEntry.setupTypeId) : '__none__'
  }

  const { register, handleSubmit, setValue, watch, formState } = useForm<KbFormValues>({
    resolver: zodResolver(kbFormSchema),
    defaultValues
  })

  const categoryValue = watch('category')
  const setupTypeIdStrValue = watch('setupTypeIdStr')

  const handleBack = (): void => {
    if (formState.isDirty) {
      setShowDiscardDialog(true)
    } else {
      onBack()
    }
  }

  const onSubmit = async (values: KbFormValues): Promise<void> => {
    setSaving(true)
    try {
      const category = values.category === '__none__' ? null : values.category
      const setupTypeId =
        values.setupTypeIdStr === '__none__' ? null : parseInt(values.setupTypeIdStr, 10)

      let result: IpcResult<KnowledgeBaseEntry>

      if (entryId === null) {
        result = (await window.api.knowledgeBase.create({
          title: values.title,
          content: values.content,
          category,
          setupTypeId
        })) as IpcResult<KnowledgeBaseEntry>
      } else {
        result = (await window.api.knowledgeBase.update({
          id: entryId,
          title: values.title,
          content: values.content,
          category,
          setupTypeId
        })) as IpcResult<KnowledgeBaseEntry>
      }

      if (result.success) {
        toast({ title: entryId === null ? 'Entry created' : 'Entry saved' })
        onSaved()
      } else {
        toast({ variant: 'destructive', title: 'Could not save entry', description: result.error })
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteConfirmed = async (): Promise<void> => {
    if (entryId === null) return
    setDeleting(true)
    setShowDeleteDialog(false)
    try {
      const result = (await window.api.knowledgeBase.delete({ id: entryId })) as IpcResult<void>
      if (result.success) {
        toast({ title: 'Entry deleted' })
        onDeleted()
      } else {
        toast({ variant: 'destructive', title: 'Could not delete entry', description: result.error })
      }
    } finally {
      setDeleting(false)
    }
  }

  const titleError = formState.errors.title?.message
  const contentError = formState.errors.content?.message

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <button
          type="button"
          className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          onClick={handleBack}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to list
        </button>

        {entryId !== null && (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-destructive"
            disabled={deleting || saving}
            onClick={() => setShowDeleteDialog(true)}
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        )}
      </div>

      <form className="flex-1 overflow-y-auto" onSubmit={handleSubmit(onSubmit)}>
        <div className="px-6 py-5">
          <div className="max-w-2xl space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="kb-title" className="text-sm font-medium">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="kb-title"
                placeholder="E.g. FVG Sweep entry rules"
                {...register('title')}
              />
              {titleError && (
                <p className="text-xs text-destructive">{titleError}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Category</Label>
                <Select
                  value={categoryValue}
                  onValueChange={(v) => setValue('category', v, { shouldDirty: true })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No category</SelectItem>
                    {KB_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Setup type</Label>
                <Select
                  value={setupTypeIdStrValue}
                  onValueChange={(v) => setValue('setupTypeIdStr', v, { shouldDirty: true })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No setup type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No setup type</SelectItem>
                    {setupTypes.map((st) => (
                      <SelectItem key={st.id} value={String(st.id)}>{st.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="kb-content" className="text-sm font-medium">
                Content <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="kb-content"
                rows={16}
                placeholder="Write your strategy notes here..."
                {...register('content')}
              />
              {contentError && (
                <p className="text-xs text-destructive">{contentError}</p>
              )}
            </div>

            <div className="flex justify-end pb-4 pt-2">
              <Button type="submit" disabled={saving || deleting}>
                {saving ? 'Saving…' : entryId === null ? 'Create entry' : 'Save entry'}
              </Button>
            </div>
          </div>
        </div>
      </form>

      <KbDeleteDialog
        open={showDeleteDialog}
        onConfirm={() => void handleDeleteConfirmed()}
        onCancel={() => setShowDeleteDialog(false)}
      />

      <Dialog open={showDiscardDialog} onOpenChange={(o) => { if (!o) setShowDiscardDialog(false) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Discard changes?</DialogTitle>
            <DialogDescription>
              You have unsaved changes. Going back will discard them.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDiscardDialog(false)}>Keep editing</Button>
            <Button variant="destructive" onClick={() => { setShowDiscardDialog(false); onBack() }}>
              Discard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
