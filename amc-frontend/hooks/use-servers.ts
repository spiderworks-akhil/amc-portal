"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import apiClient from "@/lib/api-client"
import type { ApiResponse, CreateServerPayload, ServerListItem, ServerDetail, PaginatedResponse, UpdateServerPayload } from "@/types/api"

const SERVERS_KEY = "servers"

export function useServer(id: string | null) {
  return useQuery({
    queryKey: [SERVERS_KEY, id],
    queryFn: async () => {
      const { data } = await apiClient.get<ServerDetail>(`/server/${id}`)
      return data
    },
    enabled: !!id,
  })
}

export function useServers(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: [SERVERS_KEY, "list", params],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<ServerListItem>>("/server/list", { params })
      return data
    },
  })
}

export function useCreateServer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateServerPayload) => {
      const { data } = await apiClient.post<ApiResponse<ServerListItem>>("/server", payload)
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [SERVERS_KEY] })
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export interface DetectProviderResult {
  detected: boolean
  provider_id?: string
  organization?: string
  region?: string
  city?: string
  country?: string
  message?: string
}

export function useDetectServerProvider() {
  return useMutation({
    mutationFn: async (ip: string) => {
      const { data } = await apiClient.get<DetectProviderResult>("/server/detect-provider", { params: { ip } })
      return data
    },
  })
}

export function useUpdateServer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: UpdateServerPayload & { id: string }) => {
      const { data } = await apiClient.put<ApiResponse<ServerListItem>>(`/server/${id}`, payload)
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [SERVERS_KEY] })
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useDeleteServer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.delete<ApiResponse<{ message: string }>>(`/server/${id}`)
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [SERVERS_KEY] })
      toast.success("Server deleted")
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useLinkAssetToServer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ serverId, asset_ids }: { serverId: string; asset_ids: string[] }) => {
      const { data } = await apiClient.post<ApiResponse<{ inserted: number }>>(
        `/server/${serverId}/assets`,
        { asset_ids }
      )
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assets"] })
      qc.invalidateQueries({ queryKey: [SERVERS_KEY] })
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
