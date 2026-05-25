import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@renderer/components/ui/dialog'
import { Button } from '@renderer/components/ui/button'

interface PnlWarningDialogProps {
  open: boolean
  message: string
  onProceed: () => void
  onCancel: () => void
}

export function PnlWarningDialog({
  open,
  message,
  onProceed,
  onCancel
}: PnlWarningDialogProps): JSX.Element {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>P&amp;L Warning</DialogTitle>
          <DialogDescription>{message}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Go Back
          </Button>
          <Button variant="destructive" onClick={onProceed}>
            Proceed Anyway
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
