import { Layout } from '@renderer/components/layout/layout'
import { Toaster } from '@renderer/components/ui/toaster'
import { TradeLoggerPage } from '@renderer/pages/trade-logger-page'
import { SettingsPage } from '@renderer/pages/settings-page'
import { PlaceholderPage } from '@renderer/pages/placeholder-page'
import { useNavigationStore, type Page } from '@renderer/stores/navigation-store'

function PageRouter(): JSX.Element {
  const activePage = useNavigationStore((s) => s.activePage)

  const pages: Record<Page, JSX.Element> = {
    'trade-logger': <TradeLoggerPage />,
    'log-viewer': <PlaceholderPage name="log-viewer" />,
    'calendar': <PlaceholderPage name="calendar" />,
    'strategy-rules': <PlaceholderPage name="strategy-rules" />,
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
