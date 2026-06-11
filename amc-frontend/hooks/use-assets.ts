"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import apiClient from "@/lib/api-client"
import type {
  AssetListItem,
  AssetType,
  PaginatedResponse,
  ApiResponse,
  CreateAssetPayload,
  CreateAssetTypePayload,
} from "@/types/api"

const ASSETS_KEY = "assets"

export function useClientAssets(clientId: string | null) {
  return useQuery({
    queryKey: [ASSETS_KEY, "by-client", clientId],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<AssetListItem>>(
        "/asset/list",
        { params: { client_id: clientId, limit: 100, sort_by: "name", sort_order: "asc" } }
      )
      return data
    },
    enabled: !!clientId,
  })
}

export function useCreateAsset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateAssetPayload) => {
      const { data } = await apiClient.post<ApiResponse<AssetListItem>>("/asset", payload)
      return data
    },
    onSuccess: (res) => {
      toast.success(res.message)
      qc.invalidateQueries({ queryKey: [ASSETS_KEY] })
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useAssetTypes() {
  return useQuery({
    queryKey: [ASSETS_KEY, "types"],
    queryFn: async () => {
      const { data } = await apiClient.get<AssetType[]>("/asset/types")
      return data
    },
    staleTime: 300_000,
  })
}

export function useCreateAssetType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateAssetTypePayload) => {
      const { data } = await apiClient.post<ApiResponse<AssetType>>("/asset/types", payload)
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [ASSETS_KEY, "types"] })
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
