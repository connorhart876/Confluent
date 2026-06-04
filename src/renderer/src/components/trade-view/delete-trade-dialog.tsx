import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@renderer/components/ui/dialog'
import { Button } from '@renderer/components/ui/button'

interface DeleteTradeDialogProps {
  open: boolean
  tradeLabel: string
  deleting: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function DeleteTradeDialog({
  open,
  tradeLabel,
  deleting,
  onConfirm,
  onCancel
}: DeleteTradeDialogProps): JSX.Element {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete trade?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{tradeLabel}</span> will be permanently
          deleted, including its screenshot. This cannot be undone.
        </p>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onCancel} disabled={deleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
