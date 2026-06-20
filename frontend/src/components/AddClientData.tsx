import { useState } from 'react'
import { Plus, Sparkles } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useAddComment } from '@/lib/queries'
import type { CommentChannel } from '@/lib/api-types'
import { channelLabel } from '@/lib/format'

const CHANNELS: CommentChannel[] = ['meeting', 'call', 'email', 'whatsapp', 'other']

export function AddClientData({ customerId }: { customerId: string }) {
  const [open, setOpen] = useState(false)
  const [channel, setChannel] = useState<CommentChannel>('meeting')
  const [content, setContent] = useState('')
  const add = useAddComment(customerId)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return
    add.mutate(
      { channel, content: content.trim() },
      {
        onSuccess: () => {
          setContent('')
          setOpen(false)
        },
      },
    )
  }

  if (!open) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-dashed border-border bg-muted/30 px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="size-4 text-accent" />
          Add an interaction to enrich the client’s DNA.
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus /> Add client data
        </Button>
      </div>
    )
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-3 rounded-lg border border-border bg-card p-4"
    >
      <div className="eyebrow">New interaction</div>

      <div className="flex flex-wrap gap-1.5">
        {CHANNELS.map((ch) => (
          <button
            key={ch}
            type="button"
            onClick={() => setChannel(ch)}
            className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
              channel === ch
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            {channelLabel[ch]}
          </button>
        ))}
      </div>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={3}
        autoFocus
        placeholder="e.g. Lunch in Zurich — the family reaffirmed their commitment to the foundation’s research cause."
        className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-ring/30"
      />

      {add.isError ? (
        <p className="text-sm text-destructive">Couldn’t save. Try again.</p>
      ) : null}

      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setOpen(false)}
          disabled={add.isPending}
        >
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={add.isPending || !content.trim()}>
          {add.isPending ? 'Saving…' : 'Save interaction'}
        </Button>
      </div>
    </form>
  )
}
