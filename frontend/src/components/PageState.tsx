import { Loader2, TriangleAlert } from 'lucide-react'

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-24 text-muted-foreground">
      <Loader2 className="size-4 animate-spin" />
      <span className="eyebrow">{label}</span>
    </div>
  )
}

export function ErrorState({ message }: { message?: string }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-2 py-20 text-center">
      <div className="flex size-10 items-center justify-center rounded-full bg-destructive/12 text-destructive">
        <TriangleAlert className="size-5" />
      </div>
      <div className="text-sm font-medium">Couldn’t reach the workbench API</div>
      <p className="text-sm text-muted-foreground">
        {message ?? 'Start the backend with `npm run dev` in /server, then retry.'}
      </p>
    </div>
  )
}

export function EmptyState({
  title,
  description,
}: {
  title: string
  description?: string
}) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-muted/30 px-6 py-12 text-center">
      <div className="text-sm font-medium">{title}</div>
      {description ? (
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      ) : null}
    </div>
  )
}
