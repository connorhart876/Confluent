import { BookOpen, Inbox, LayoutDashboard, Plus, ScrollText, Settings } from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import { type Page, useNavigationStore } from '@renderer/stores/navigation-store'
import { Button } from '@renderer/components/ui/button'
import { useImportReviewStore } from '@renderer/stores/import-review-store'

const navItems: { page: Page; label: string; icon: React.ElementType }[] = [
  { page: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { page: 'import-review', label: 'Import Review', icon: Inbox },
  { page: 'strategy-rules', label: 'Strategy Rules', icon: ScrollText },
  { page: 'knowledge-base', label: 'Knowledge Base', icon: BookOpen },
  { page: 'settings', label: 'Settings', icon: Settings }
]

export function Sidebar(): JSX.Element {
  const { activePage, setPage } = useNavigationStore()
  const pendingCount = useImportReviewStore((s) => s.pendingImports.length)

  return (
    <aside className="flex h-screen w-56 flex-shrink-0 flex-col border-r border-border bg-card">
      <div className="flex h-14 items-center px-4 border-b border-border">
        <span className="text-base font-semibold tracking-tight text-foreground">Confluent</span>
      </div>
      <div className="p-2 border-b border-border">
        <Button
          className="w-full gap-2"
          onClick={() => setPage('trade-logger')}
        >
          <Plus className="h-4 w-4 flex-shrink-0" />
          Add Trade
        </Button>
      </div>
      <nav className="flex flex-col gap-1 p-2 flex-1">
        {navItems.map(({ page, label, icon: Icon }) => (
          <button
            key={page}
            onClick={() => setPage(page)}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors text-left w-full',
              activePage === page
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            <span className="flex-1">{label}</span>
            {page === 'import-review' && pendingCount > 0 && (
              <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold leading-none text-primary-foreground">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </nav>
    </aside>
  )
}
