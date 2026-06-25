"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import apiClient from "@/lib/api-client"
import type {
  AuditLogListItem,
  PaginatedResponse,
  ListAuditLogsParams,
} from "@/types/api"

const AUDIT_LOGS_KEY = "audit-logs"

export function useAuditLogs(params: ListAuditLogsParams) {
  return useQuery({
    queryKey: [AUDIT_LOGS_KEY, "list", params],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<AuditLogListItem>>("/audit-log/list", { params })
      return data
    },
    placeholderData: (prev) => prev,
  })
}

export function useAuditLog(id: string | null) {
  return useQuery({
    queryKey: [AUDIT_LOGS_KEY, id],
    queryFn: async () => {
      const { data } = await apiClient.get<AuditLogListItem>(`/audit-log/${id}`)
      return data
    },
    enabled: !!id,
  })
}

export function useRecentAuditLogs(limit = 20) {
  return useQuery({
    queryKey: [AUDIT_LOGS_KEY, "recent", limit],
    queryFn: async () => {
      const { data } = await apiClient.get<AuditLogListItem[]>("/audit-log/recent", {
        params: { limit },
      })
      return data
    },
  })
}

export function useCreateAuditLog() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      actor_id?: string
      entity_type: string
      entity_id: string
      action: string
      before?: Record<string, unknown>
      after?: Record<string, unknown>
      ip?: string
    }) => {
      const { data } = await apiClient.post("/audit-log", payload)
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [AUDIT_LOGS_KEY] })
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
