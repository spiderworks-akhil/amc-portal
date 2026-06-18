"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import apiClient from "@/lib/api-client"
import type {
  IncidentListItem,
  PaginatedResponse,
  ApiResponse,
  ListIncidentsParams,
} from "@/types/api"

const INCIDENTS_KEY = "incidents"

export function useIncidents(params: ListIncidentsParams) {
  return useQuery({
    queryKey: [INCIDENTS_KEY, "list", params],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<IncidentListItem>>("/incident/list", { params })
      return data
    },
    placeholderData: (prev) => prev,
  })
}

export function useIncident(id: string | null) {
  return useQuery({
    queryKey: [INCIDENTS_KEY, id],
    queryFn: async () => {
      const { data } = await apiClient.get<IncidentListItem>(`/incident/${id}`)
      return data
    },
    enabled: !!id,
  })
}

export function useResolveIncident() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.post<ApiResponse<IncidentListItem>>(`/incident/${id}/resolve`)
      return data
    },
    onSuccess: (res) => {
      toast.success("Incident resolved")
      qc.invalidateQueries({ queryKey: [INCIDENTS_KEY] })
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useAcknowledgeIncident() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.post<ApiResponse<IncidentListItem>>(`/incident/${id}/acknowledge`)
      return data
    },
    onSuccess: (res) => {
      toast.success("Incident acknowledged")
      qc.invalidateQueries({ queryKey: [INCIDENTS_KEY] })
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useDeleteIncident() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.delete<ApiResponse<null>>(`/incident/${id}`)
      return data
    },
    onSuccess: (res) => {
      toast.success(res.message)
      qc.invalidateQueries({ queryKey: [INCIDENTS_KEY] })
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
