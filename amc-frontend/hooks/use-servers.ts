"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import apiClient from "@/lib/api-client"
import type { ApiResponse, CreateServerPayload, ServerListItem, ServerDetail, PaginatedResponse } from "@/types/api"

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
