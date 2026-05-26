import { SetupTypeList } from '@renderer/components/settings/setup-type-list'

export function SettingsPage(): JSX.Element {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-b border-border px-6 py-4">
        <h1 className="text-lg font-semibold">Settings</h1>
      </div>
      <div className="flex-1 overflow-y-auto px-6 py-5">
        <section className="max-w-xl space-y-3">
          <div>
            <h2 className="text-sm font-semibold">Setup Types</h2>
            <p className="text-sm text-muted-foreground">
              Manage the setup type labels used in the trade logger.
            </p>
          </div>
          <SetupTypeList />
        </section>
      </div>
    </div>
  )
}
