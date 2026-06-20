import type {
  Comment,
  CommentChannel,
  CustomerDetail,
  DashboardData,
  Task,
  TaskPriority,
} from './api-types'

export interface NewTaskInput {
  title: string
  description?: string
  customer_id?: string
  suggestion_id?: string
  channel?: CommentChannel
  due_date: string
  priority?: TaskPriority
}

async function http<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `Request failed (${res.status})`)
  }
  return res.json() as Promise<T>
}

export const api = {
  dashboard: () => http<DashboardData>('/api/dashboard'),
  customer: (id: string) => http<CustomerDetail>(`/api/customers/${id}`),
  addComment: (
    id: string,
    body: { channel: CommentChannel; content: string },
  ) =>
    http<Comment>(`/api/customers/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  applySuggestion: (id: string) =>
    http<{ ok: true }>(`/api/suggestions/${id}/apply`, { method: 'POST' }),
  dropSuggestion: (id: string) =>
    http<{ ok: true }>(`/api/suggestions/${id}/drop`, { method: 'POST' }),
  createTask: (body: NewTaskInput) =>
    http<Task>('/api/tasks', { method: 'POST', body: JSON.stringify(body) }),
  completeTask: (id: string) =>
    http<{ ok: true }>(`/api/tasks/${id}/complete`, { method: 'POST' }),
}
