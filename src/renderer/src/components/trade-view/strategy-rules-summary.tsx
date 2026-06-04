import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { StrategyRules } from '@shared/ipc-types'

interface StrategyRulesSummaryProps {
  rules: StrategyRules | null
}

function RuleField({ label, value }: { label: string; value: string }): JSX.Element | null {
  if (!value) return null
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <p className="whitespace-pre-wrap text-sm leading-relaxed">{value}</p>
    </div>
  )
}

export function StrategyRulesSummary({ rules }: StrategyRulesSummaryProps): JSX.Element {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-md border border-border">
      <button
        type="button"
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium hover:bg-muted/50 transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        <span>Strategy Rules</span>
        {open ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {open && (
        <div className="border-t border-border px-4 py-4">
          {rules === null ? (
            <p className="text-sm text-muted-foreground">No rules defined for this setup type.</p>
          ) : (
            <div className="space-y-4">
              <RuleField label="Entry Criteria" value={rules.entryCriteria} />
              <RuleField label="HTF Confirmation" value={rules.htfConfirmation} />
              <RuleField label="Valid vs. Premature Entry" value={rules.validVsPremature} />
              <RuleField label="Session Filter" value={rules.sessionFilter} />
              <RuleField label="Notes" value={rules.freeformNotes} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
