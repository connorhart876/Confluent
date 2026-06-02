import { useNavigationStore } from '@renderer/stores/navigation-store'

export function TradeViewPage(): JSX.Element {
  const selectedTradeId = useNavigationStore((s) => s.selectedTradeId)

  if (selectedTradeId === null) {
    return (
      <div className="flex h-full flex-col overflow-hidden">
        <div className="border-b border-border px-6 py-4">
          <h1 className="text-lg font-semibold">Trade View</h1>
          <p className="text-sm text-muted-foreground">No trade selected</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-b border-border px-6 py-4">
        <h1 className="text-lg font-semibold">Trade View</h1>
        <p className="text-sm text-muted-foreground">Trade #{selectedTradeId}</p>
      </div>
    </div>
  )
}
