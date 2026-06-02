import { Layout } from '@renderer/components/layout/layout'
import { Toaster } from '@renderer/components/ui/toaster'
import { DashboardPage } from '@renderer/pages/dashboard-page'
import { TradeLoggerPage } from '@renderer/pages/trade-logger-page'
import { TradeViewPage } from '@renderer/pages/trade-view-page'
import { KnowledgeBasePage } from '@renderer/pages/knowledge-base-page'
import { SettingsPage } from '@renderer/pages/settings-page'
import { StrategyRulesPage } from '@renderer/pages/strategy-rules-page'
import { useNavigationStore, type Page } from '@renderer/stores/navigation-store'

function PageRouter(): JSX.Element {
  const activePage = useNavigationStore((s) => s.activePage)

  const pages: Record<Page, JSX.Element> = {
    'dashboard': <DashboardPage />,
    'trade-logger': <TradeLoggerPage />,
    'trade-view': <TradeViewPage />,
    'strategy-rules': <StrategyRulesPage />,
    'knowledge-base': <KnowledgeBasePage />,
    'settings': <SettingsPage />
  }

  return pages[activePage]
}

export default function App(): JSX.Element {
  return (
    <>
      <Layout>
        <PageRouter />
      </Layout>
      <Toaster />
    </>
  )
}
