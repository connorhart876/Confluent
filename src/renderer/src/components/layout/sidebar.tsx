import { BookOpen, LayoutDashboard, Plus, ScrollText, Settings } from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import { type Page, useNavigationStore } from '@renderer/stores/navigation-store'
import { Button } from '@renderer/components/ui/button'

const navItems: { page: Page; label: string; icon: React.ElementType }[] = [
  { page: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { page: 'strategy-rules', label: 'Strategy Rules', icon: ScrollText },
  { page: 'knowledge-base', label: 'Knowledge Base', icon: BookOpen },
  { page: 'settings', label: 'Settings', icon: Settings }
]

export function Sidebar(): JSX.Element {
  const { activePage, setPage } = useNavigationStore()

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
            {label}
          </button>
        ))}
      </nav>
    </aside>
  )
}
