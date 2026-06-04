import { useEffect, useState } from 'react'
import { BrainCircuit, Loader2 } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import type { IpcResult, AiReviewResult, ApiKeyExistsResponse } from '@shared/ipc-types'
import { Button } from '@renderer/components/ui/button'

interface AiReviewSectionProps {
  tradeId: number
  savedReview: string | null | undefined
  savedReviewCreatedAt: string | null | undefined
}

export function AiReviewSection({ tradeId, savedReview, savedReviewCreatedAt }: AiReviewSectionProps): JSX.Element {
  const [review, setReview] = useState<string | null>(savedReview ?? null)
  const [reviewCreatedAt, setReviewCreatedAt] = useState<string | null>(savedReviewCreatedAt ?? null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasKey, setHasKey] = useState<boolean | null>(null)

  useEffect(() => {
    setReview(savedReview ?? null)
    setReviewCreatedAt(savedReviewCreatedAt ?? null)
    setError(null)
  }, [tradeId, savedReview, savedReviewCreatedAt])

  useEffect(() => {
    window.api.apiKey.exists()
      .then((raw) => {
        const result = raw as IpcResult<ApiKeyExistsResponse>
        if (result.success) setHasKey(result.data.exists && result.data.encryptionAvailable)
      })
      .catch(() => setHasKey(false))
  }, [])

  const requestReview = async (): Promise<void> => {
    setLoading(true)
    setError(null)
    try {
      const raw = await window.api.ai.reviewTrade({ tradeId })
      const result = raw as IpcResult<AiReviewResult>
      if (result.success) {
        setReview(result.data.review)
        setReviewCreatedAt(result.data.reviewCreatedAt)
      } else {
        setError(result.error)
      }
    } catch {
      setError('Unexpected error requesting review.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-md border border-border">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <BrainCircuit className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">AI Review</span>
          {reviewCreatedAt && (
            <span className="text-xs text-muted-foreground">
              · {format(parseISO(reviewCreatedAt), 'MMM d, yyyy')}
            </span>
          )}
        </div>
        {hasKey === true && (
          <Button
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={() => void requestReview()}
          >
            {loading ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Reviewing…
              </>
            ) : review ? (
              'Re-request Review'
            ) : (
              'Request AI Review'
            )}
          </Button>
        )}
      </div>

      <div className="px-4 py-4">
        {hasKey === null ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !hasKey ? (
          <p className="text-sm text-muted-foreground">
            AI review available after configuring API key in Settings.
          </p>
        ) : error ? (
          <div className="space-y-2">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={() => void requestReview()}>
              Retry
            </Button>
          </div>
        ) : review ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{review}</p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Click "Request AI Review" to generate a written analysis of this trade against your strategy rules.
          </p>
        )}
      </div>
    </div>
  )
}
