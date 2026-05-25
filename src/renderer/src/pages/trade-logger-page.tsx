import { useEffect, useState } from 'react'
import type { SetupType, IpcResult } from '@shared/ipc-types'
import { TradeEntryForm } from '@renderer/components/trade-form/trade-entry-form'

export function TradeLoggerPage(): JSX.Element {
  const [setupTypes, setSetupTypes] = useState<SetupType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    window.api.setupType
      .list()
      .then((raw) => {
        const result = raw as IpcResult<SetupType[]>
        if (result.success) {
          setSetupTypes(result.data)
        } else {
          setError(result.error)
        }
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Unknown error'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-b border-border px-6 py-4">
        <h1 className="text-lg font-semibold">Trade Logger</h1>
        <p className="text-sm text-muted-foreground">Log a completed trade</p>
      </div>
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : error ? (
          <p className="text-sm text-destructive">Failed to load setup types: {error}</p>
        ) : (
          <TradeEntryForm setupTypes={setupTypes} />
        )}
      </div>
    </div>
  )
}
