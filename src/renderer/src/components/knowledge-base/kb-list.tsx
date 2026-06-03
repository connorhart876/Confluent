import { useState } from 'react'
import { BookOpen, Plus } from 'lucide-react'
import type { KnowledgeBaseEntry, SetupType } from '@shared/ipc-types'
import { KB_CATEGORIES } from '@shared/constants'
import { Button } from '@renderer/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@renderer/components/ui/select'
import { cn } from '@renderer/lib/utils'
import { format, parseISO } from 'date-fns'

interface KbListProps {
  entries: KnowledgeBaseEntry[]
  setupTypes: SetupType[]
  onSelect: (id: number) => void
  onNew: () => void
}

export function KbList({ entries, setupTypes, onSelect, onNew }: KbListProps): JSX.Element {
  const [filterCategory, setFilterCategory] = useState<string>('__all__')
  const [filterSetupTypeId, setFilterSetupTypeId] = useState<string>('__all__')

  const setupTypeMap = new Map(setupTypes.map((st) => [st.id, st.name]))

  const filtered = entries.filter((e) => {
    if (filterCategory !== '__all__' && e.category !== filterCategory) return false
    if (filterSetupTypeId !== '__all__') {
      const id = parseInt(filterSetupTypeId, 10)
      if (e.setupTypeId !== id) return false
    }
    return true
  })

  const hasEntries = entries.length > 0
  const hasFiltered = filtered.length > 0

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="h-8 w-48 text-sm">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All categories</SelectItem>
                {KB_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterSetupTypeId} onValueChange={setFilterSetupTypeId}>
              <SelectTrigger className="h-8 w-44 text-sm">
                <SelectValue placeholder="All setups" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All setups</SelectItem>
                {setupTypes.map((st) => (
                  <SelectItem key={st.id} value={String(st.id)}>{st.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button size="sm" onClick={onNew}>
            <Plus className="mr-1.5 h-4 w-4" />
            New entry
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {!hasEntries ? (
          <EmptyStateFull onNew={onNew} />
        ) : !hasFiltered ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted-foreground">No entries match these filters.</p>
          </div>
        ) : (
          <div className="max-w-3xl space-y-2">
            {filtered.map((entry) => (
              <EntryRow
                key={entry.id}
                entry={entry}
                setupTypeName={entry.setupTypeId != null ? (setupTypeMap.get(entry.setupTypeId) ?? null) : null}
                onClick={() => onSelect(entry.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

interface EntryRowProps {
  entry: KnowledgeBaseEntry
  setupTypeName: string | null
  onClick: () => void
}

function EntryRow({ entry, setupTypeName, onClick }: EntryRowProps): JSX.Element {
  const updatedAt = entry.updatedAt ? format(parseISO(entry.updatedAt), 'MMM d, yyyy') : null

  return (
    <button
      type="button"
      className={cn(
        'group w-full rounded-md border border-border bg-card px-4 py-3 text-left transition-colors',
        'hover:border-primary/40 hover:bg-accent'
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{entry.title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {entry.category && (
              <span className="rounded-sm bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
                {entry.category}
              </span>
            )}
            {setupTypeName && (
              <span className="text-xs text-muted-foreground">{setupTypeName}</span>
            )}
          </div>
        </div>
        {updatedAt && (
          <span className="shrink-0 text-xs text-muted-foreground">{updatedAt}</span>
        )}
      </div>
    </button>
  )
}

function EmptyStateFull({ onNew }: { onNew: () => void }): JSX.Element {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 py-16">
      <BookOpen className="h-10 w-10 text-muted-foreground/40" />
      <div className="max-w-sm space-y-1.5 text-center">
        <p className="text-sm font-medium">No knowledge base entries yet</p>
        <p className="text-sm text-muted-foreground">
          Use this section to document your trading system — entry models, HTF context
          requirements, setup-specific rules, and known mistakes. The AI post-trade review will
          read these entries alongside your Strategy Rules.
        </p>
      </div>
      <Button size="sm" onClick={onNew}>
        <Plus className="mr-1.5 h-4 w-4" />
        New entry
      </Button>
    </div>
  )
}
