interface PlaceholderPageProps {
  name: string
}

export function PlaceholderPage({ name }: PlaceholderPageProps): JSX.Element {
  return (
    <div className="flex h-full items-center justify-center">
      <p className="text-muted-foreground capitalize">{name.replace('-', ' ')} — coming soon</p>
    </div>
  )
}
