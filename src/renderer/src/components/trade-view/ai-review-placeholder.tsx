import { BrainCircuit } from 'lucide-react'

export function AiReviewPlaceholder(): JSX.Element {
  return (
    <div className="rounded-md border border-border">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <BrainCircuit className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">AI Review</span>
      </div>
      <div className="px-4 py-4">
        <p className="text-sm text-muted-foreground">
          AI review available after configuring API key in Settings.
        </p>
      </div>
    </div>
  )
}
