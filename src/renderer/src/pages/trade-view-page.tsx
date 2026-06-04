import { useEffect, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react'
import type { Trade, SetupType, StrategyRules, IpcResult } from '@shared/ipc-types'
import { useNavigationStore } from '@renderer/stores/navigation-store'
import { toast } from '@renderer/components/ui/use-toast'
import { Button } from '@renderer/components/ui/button'
import { TradeDetailContent } from '@renderer/components/trade-view/trade-detail-content'
import { StrategyRulesSummary } from '@renderer/components/trade-view/strategy-rules-summary'
import { AiReviewSection } from '@renderer/components/trade-view/ai-review-section'
import { DeleteTradeDialog } from '@renderer/components/trade-view/delete-trade-dialog'
import { TradeEntryForm } from '@renderer/components/trade-form/trade-entry-form'

export function TradeViewPage(): JSX.Element {
  const selectedTradeId = useNavigationStore((s) => s.selectedTradeId)
  const goBack = useNavigationStore((s) => s.goBack)
  const setPage = useNavigationStore((s) => s.setPage)

  const [trade, setTrade] = useState<Trade | null>(null)
  const [setupTypeName, setSetupTypeName] = useState<string>('Unknown')
  const [setupTypes, setSetupTypes] = useState<SetupType[]>([])
  const [rules, setRules] = useState<StrategyRules | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [editing, setEditing] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!selectedTradeId) {
      setLoading(false)
      setNotFound(true)
      return
    }

    let cancelled = false
    setTrade(null)
    setRules(null)
    setLoading(true)
    setNotFound(false)
    setEditing(false)

    const fetchTrade = window.api.trade.get({ id: selectedTradeId }).then((raw) => {
      const result = raw as IpcResult<Trade>
      if (cancelled) return null
      if (!result.success) {
        setNotFound(true)
        return null
      }
      setTrade(result.data)
      return result.data
    })

    const fetchSetupTypes = window.api.setupType.list().then((raw) => {
      if (cancelled) return
      const result = raw as IpcResult<SetupType[]>
      if (result.success) setSetupTypes(result.data)
    })

    Promise.all([fetchTrade, fetchSetupTypes]).then(([loadedTrade]) => {
      if (cancelled || !loadedTrade) {
        if (!cancelled) setLoading(false)
        return
      }

      window.api.strategyRules
        .get({ setupTypeId: loadedTrade.setupTypeId })
        .then((raw) => {
          if (cancelled) return
          const result = raw as IpcResult<StrategyRules>
          setRules(result.success ? result.data : null)
        })
        .catch(() => {
          if (!cancelled) setRules(null)
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    }).catch(() => {
      if (!cancelled) setLoading(false)
    })

    return () => { cancelled = true }
  }, [selectedTradeId])

  // Sync setup type name once setupTypes load alongside the trade
  useEffect(() => {
    if (trade && setupTypes.length > 0) {
      const name = setupTypes.find((st) => st.id === trade.setupTypeId)?.name ?? 'Unknown'
      setSetupTypeName(name)
    }
  }, [trade, setupTypes])

  const handleSaved = (updated: Trade): void => {
    setTrade(updated)
    setEditing(false)
  }

  const handleDelete = async (): Promise<void> => {
    if (!trade) return
    setDeleting(true)
    try {
      const result = await window.api.trade.delete({ id: trade.id }) as IpcResult<undefined>
      if (!result.success) {
        toast({ variant: 'destructive', title: 'Delete failed', description: result.error })
        return
      }
      toast({ title: 'Trade deleted' })
      setDeleteOpen(false)
      goBack()
    } finally {
      setDeleting(false)
    }
  }

  const tradeLabel = trade
    ? `${trade.instrument} ${trade.direction} — ${format(parseISO(trade.entryTime), 'MMM d, yyyy')}`
    : 'this trade'

  if (loading) {
    return (
      <div className="flex h-full flex-col overflow-hidden">
        <div className="border-b border-border px-6 py-4">
          <h1 className="text-lg font-semibold">Trade View</h1>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      </div>
    )
  }

  if (notFound || !trade) {
    return (
      <div className="flex h-full flex-col overflow-hidden">
        <div className="border-b border-border px-6 py-4">
          <h1 className="text-lg font-semibold">Trade View</h1>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-3">
          <p className="text-sm text-muted-foreground">Trade not found.</p>
          <Button variant="outline" size="sm" onClick={() => setPage('dashboard')}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={goBack}
            aria-label="Go back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold">{tradeLabel}</h1>
            {!editing && (
              <p className="text-sm text-muted-foreground">
                {trade.session} · {trade.outcome}
              </p>
            )}
          </div>
        </div>

        {!editing && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" />
              Edit
            </Button>
            <Button variant="outline" size="sm" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="mr-1.5 h-3.5 w-3.5 text-destructive" />
              Delete
            </Button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        {editing ? (
          <div className="max-w-2xl">
            <TradeEntryForm
              setupTypes={setupTypes}
              mode="edit"
              initialTrade={trade}
              onSaved={handleSaved}
              onCancel={() => setEditing(false)}
            />
          </div>
        ) : (
          <div className="max-w-2xl space-y-5">
            <TradeDetailContent trade={trade} setupTypeName={setupTypeName} />
            <StrategyRulesSummary rules={rules} />
            <AiReviewSection
              tradeId={trade.id}
              savedReview={trade.review}
              savedReviewCreatedAt={trade.reviewCreatedAt}
            />
          </div>
        )}
      </div>

      <DeleteTradeDialog
        open={deleteOpen}
        tradeLabel={tradeLabel}
        deleting={deleting}
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  )
}
