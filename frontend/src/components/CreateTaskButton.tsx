import { useState } from 'react'
import { CalendarPlus, Check } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useCreateTask } from '@/lib/queries'
import type { CommentChannel, TaskPriority } from '@/lib/api-types'
import { cn } from '@/lib/utils'

function inDays(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

const PRIORITIES: TaskPriority[] = ['low', 'medium', 'high']

export function CreateTaskButton({
  customerId,
  suggestionId,
  defaultTitle,
  defaultChannel,
}: {
  customerId?: string
  suggestionId?: string
  defaultTitle: string
  defaultChannel?: CommentChannel | null
}) {
  const [open, setOpen] = useState(false)
  const [done, setDone] = useState(false)
  const [title, setTitle] = useState(defaultTitle)
  const [due, setDue] = useState(inDays(3))
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const create = useCreateTask(customerId)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    create.mutate(
      {
        title: title.trim(),
        due_date: due,
        priority,
        customer_id: customerId,
        suggestion_id: suggestionId,
        channel: defaultChannel ?? undefined,
      },
      {
        onSuccess: () => {
          setDone(true)
          setOpen(false)
        },
      },
    )
  }

  if (done) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-success">
        <Check className="size-4" /> Follow-up scheduled
      </span>
    )
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <CalendarPlus /> Create follow-up
      </Button>
    )
  }

  return (
    <form
      onSubmit={submit}
      className="w-full space-y-2 rounded-md border border-border bg-background/60 p-3"
    >
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full rounded-md border border-input bg-card px-2.5 py-1.5 text-sm outline-none focus:border-accent"
      />
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="date"
          value={due}
          onChange={(e) => setDue(e.target.value)}
          className="tnum rounded-md border border-input bg-card px-2.5 py-1.5 text-sm outline-none focus:border-accent"
        />
        <div className="flex gap-1">
          {PRIORITIES.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPriority(p)}
              className={cn(
                'rounded-md border px-2 py-1 text-xs font-medium capitalize transition-colors',
                priority === p
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-border text-muted-foreground hover:text-foreground',
              )}
            >
              {p}
            </button>
          ))}
        </div>
        <div className="ml-auto flex gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setOpen(false)}
            disabled={create.isPending}
          >
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={create.isPending || !title.trim()}>
            {create.isPending ? 'Saving…' : 'Schedule'}
          </Button>
        </div>
      </div>
    </form>
  )
}
