import { useEffect, useRef, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import type { SetupType, StrategyRules, IpcResult } from '@shared/ipc-types'
import { RulesEditor } from '@renderer/components/strategy-rules/rules-editor'
import { Button } from '@renderer/components/ui/button'
import { toast } from '@renderer/components/ui/use-toast'
import { useNavigationStore } from '@renderer/stores/navigation-store'
import { cn } from '@renderer/lib/utils'

export function StrategyRulesPage(): JSX.Element {
  const setPage = useNavigationStore((s) => s.setPage)

  const [setupTypes, setSetupTypes] = useState<SetupType[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [rules, setRules] = useState<StrategyRules | null>(null)
  const [rulesLoading, setRulesLoading] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [pendingId, setPendingId] = useState<number | null>(null)
  const pendingIdRef = useRef<number | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    pendingIdRef.current = pendingId
  }, [pendingId])

  // Load setup types on mount, auto-select first
  useEffect(() => {
    window.api.setupType
      .list()
      .then((raw) => {
        const result = raw as IpcResult<SetupType[]>
        if (result.success) {
          setSetupTypes(result.data)
          if (result.data.length > 0) setSelectedId(result.data[0].id)
        } else {
          toast({ variant: 'destructive', title: 'Failed to load setup types', description: result.error })
        }
      })
      .catch(() => toast({ variant: 'destructive', title: 'Failed to load setup types' }))
      .finally(() => setLoading(false))
  }, [])

  // Load rules whenever selected setup type changes
  useEffect(() => {
    if (selectedId === null) return
    setRulesLoading(true)
    setRules(null)
    window.api.strategyRules
      .get({ setupTypeId: selectedId })
      .then((raw) => {
        const result = raw as IpcResult<StrategyRules>
        if (result.success) setRules(result.data)
        else toast({ variant: 'destructive', title: 'Failed to load rules', description: result.error })
      })
      .catch(() => toast({ variant: 'destructive', title: 'Failed to load rules' }))
      .finally(() => setRulesLoading(false))
  }, [selectedId])

  const switchTo = (id: number): void => {
    setSelectedId(id)
    setRules(null)
    setIsDirty(false)
    setPendingId(null)
  }

  const trySelectId = (id: number): void => {
    if (id === selectedId) return
    if (isDirty) {
      setPendingId(id)
    } else {
      switchTo(id)
    }
  }

  const handleBannerSave = (): void => {
    formRef.current?.requestSubmit()
  }

  const handleBannerDiscard = (): void => {
    const target = pendingIdRef.current
    if (target !== null) switchTo(target)
  }

  const handleSaved = (): void => {
    const target = pendingIdRef.current
    if (target !== null) switchTo(target)
  }

  const selected = setupTypes.find((st) => st.id === selectedId) ?? null

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-b border-border px-6 py-4">
        <h1 className="text-lg font-semibold">Strategy Rules</h1>
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      ) : setupTypes.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="space-y-2 text-center">
            <p className="text-sm text-muted-foreground">No setup types yet.</p>
            <button
              type="button"
              className="text-sm text-primary underline underline-offset-2 hover:opacity-80"
              onClick={() => setPage('settings')}
            >
              Add one in Settings
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          {/* Left panel: setup type list */}
          <aside className="flex w-48 flex-shrink-0 flex-col border-r border-border overflow-hidden">
            {pendingId !== null && (
              <div className="border-b border-border bg-amber-500/10 px-3 py-2.5">
                <div className="flex items-center gap-1.5 text-amber-500">
                  <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="text-xs font-medium">Unsaved changes</span>
                </div>
                <div className="mt-2 flex gap-1.5">
                  <Button size="sm" className="h-6 flex-1 text-xs" onClick={handleBannerSave}>
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 flex-1 text-xs"
                    onClick={handleBannerDiscard}
                  >
                    Discard
                  </Button>
                </div>
              </div>
            )}

            <nav className="flex-1 overflow-y-auto py-2">
              {setupTypes.map((st) => (
                <button
                  key={st.id}
                  type="button"
                  className={cn(
                    'w-full truncate px-4 py-2.5 text-left text-sm transition-colors',
                    st.id === selectedId
                      ? 'bg-primary/10 font-medium text-primary'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  )}
                  onClick={() => trySelectId(st.id)}
                >
                  {st.name}
                </button>
              ))}
            </nav>
          </aside>

          {/* Right panel: rules editor */}
          <main className="flex flex-1 flex-col overflow-hidden">
            {rulesLoading || rules === null ? (
              <div className="flex flex-1 items-center justify-center">
                <p className="text-sm text-muted-foreground">Loading…</p>
              </div>
            ) : selected !== null ? (
              <RulesEditor
                setupType={selected}
                initialRules={rules}
                onDirtyChange={setIsDirty}
                onSaved={handleSaved}
                formRef={formRef}
              />
            ) : null}
          </main>
        </div>
      )}
    </div>
  )
}
