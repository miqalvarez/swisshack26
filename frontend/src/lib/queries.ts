import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'

import { api, type NewTaskInput } from './api'
import type { CommentChannel } from './api-types'

export function useDashboard() {
  return useQuery({ queryKey: ['dashboard'], queryFn: api.dashboard })
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: ['customer', id],
    queryFn: () => api.customer(id),
    enabled: !!id,
  })
}

/** Invalidate everything that a suggestion/comment mutation can affect. */
function useRefreshAll(customerId?: string) {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: ['dashboard'] })
    if (customerId) qc.invalidateQueries({ queryKey: ['customer', customerId] })
  }
}

export function useApplySuggestion(customerId: string) {
  const refresh = useRefreshAll(customerId)
  return useMutation({
    mutationFn: (suggestionId: string) => api.applySuggestion(suggestionId),
    onSuccess: refresh,
  })
}

export function useDropSuggestion(customerId: string) {
  const refresh = useRefreshAll(customerId)
  return useMutation({
    mutationFn: (suggestionId: string) => api.dropSuggestion(suggestionId),
    onSuccess: refresh,
  })
}

export function useAddComment(customerId: string) {
  const refresh = useRefreshAll(customerId)
  return useMutation({
    mutationFn: (body: { channel: CommentChannel; content: string }) =>
      api.addComment(customerId, body),
    onSuccess: refresh,
  })
}

export function useCreateTask(customerId?: string) {
  const refresh = useRefreshAll(customerId)
  return useMutation({
    mutationFn: (body: NewTaskInput) => api.createTask(body),
    onSuccess: refresh,
  })
}

export function useCompleteTask(customerId?: string) {
  const refresh = useRefreshAll(customerId)
  return useMutation({
    mutationFn: (taskId: string) => api.completeTask(taskId),
    onSuccess: refresh,
  })
}
