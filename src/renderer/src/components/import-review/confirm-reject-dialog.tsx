import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@renderer/components/ui/dialog'
import { Button } from '@renderer/components/ui/button'

interface ConfirmRejectDialogProps {
  open: boolean
  count: number
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmRejectDialog({ open, count, onConfirm, onCancel }: ConfirmRejectDialogProps): JSX.Element {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Reject {count} pending import{count !== 1 ? 's' : ''}?</DialogTitle>
          <DialogDescription>
            This will permanently remove the selected trade{count !== 1 ? 's' : ''} from the review queue. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button variant="destructive" onClick={onConfirm}>
            Reject {count} trade{count !== 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
