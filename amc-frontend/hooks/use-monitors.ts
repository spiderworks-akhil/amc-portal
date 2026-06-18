"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import apiClient from "@/lib/api-client"
import type {
  MonitorListItem,
  MonitorDetail,
  MonitorCheck,
  PaginatedResponse,
  ApiResponse,
  CreateMonitorPayload,
  UpdateMonitorPayload,
  ListMonitorsParams,
} from "@/types/api"

const MONITORS_KEY = "monitors"

export function useMonitors(params: ListMonitorsParams) {
  return useQuery({
    queryKey: [MONITORS_KEY, "list", params],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<MonitorListItem>>("/monitor/list", { params })
      return data
    },
    placeholderData: (prev) => prev,
  })
}

export function useMonitorsByAsset(assetId: string | null) {
  return useQuery({
    queryKey: [MONITORS_KEY, "by-asset", assetId],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<MonitorListItem>>(
        "/monitor/list",
        { params: { asset_id: assetId, limit: 100, sort_by: "name", sort_order: "asc" } }
      )
      return data
    },
    enabled: !!assetId,
  })
}

export function useMonitor(id: string | null) {
  return useQuery({
    queryKey: [MONITORS_KEY, id],
    queryFn: async () => {
      const { data } = await apiClient.get<MonitorDetail>(`/monitor/${id}`)
      return data
    },
    enabled: !!id,
  })
}

export function useCreateMonitor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateMonitorPayload) => {
      const { data } = await apiClient.post<ApiResponse<MonitorListItem>>("/monitor", payload)
      return data
    },
    onSuccess: (res) => {
      toast.success(res.message)
      qc.invalidateQueries({ queryKey: [MONITORS_KEY] })
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUpdateMonitor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: UpdateMonitorPayload & { id: string }) => {
      const { data } = await apiClient.put<ApiResponse<MonitorListItem>>(`/monitor/${id}`, payload)
      return data
    },
    onSuccess: (res) => {
      toast.success(res.message)
      qc.invalidateQueries({ queryKey: [MONITORS_KEY] })
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useDeleteMonitor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.delete<ApiResponse<null>>(`/monitor/${id}`)
      return data
    },
    onSuccess: (res) => {
      toast.success(res.message)
      qc.invalidateQueries({ queryKey: [MONITORS_KEY] })
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useTriggerCheck() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.post<ApiResponse<MonitorCheck>>(`/monitor/${id}/check`)
      return data
    },
    onSuccess: (res) => {
      toast.success("Check completed")
      qc.invalidateQueries({ queryKey: [MONITORS_KEY] })
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useMonitorChecks(monitorId: string | null, page = 1, limit = 50) {
  return useQuery({
    queryKey: [MONITORS_KEY, "checks", monitorId, page, limit],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<MonitorCheck>>(
        `/monitor/${monitorId}/checks`,
        { params: { page, limit } }
      )
      return data
    },
    enabled: !!monitorId,
  })
}
