"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import apiClient from "@/lib/api-client"
import type {
  AssetListItem,
  AssetDetail,
  PaginatedResponse,
  ApiResponse,
  CreateAssetPayload,
  UpdateAssetPayload,
  ListAssetsParams,
  ContractListItem,
} from "@/types/api"

const ASSETS_KEY = "assets"

export function useAssets(params: ListAssetsParams) {
  return useQuery({
    queryKey: [ASSETS_KEY, "list", params],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<AssetListItem>>("/asset/list", { params })
      return data
    },
    placeholderData: (prev) => prev,
  })
}

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

export function useAsset(id: string | null) {
  return useQuery({
    queryKey: [ASSETS_KEY, id],
    queryFn: async () => {
      const { data } = await apiClient.get<AssetDetail>(`/asset/${id}`)
      return data
    },
    enabled: !!id,
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

export function useUpdateAsset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: UpdateAssetPayload & { id: string }) => {
      const { data } = await apiClient.put<ApiResponse<AssetListItem>>(`/asset/${id}`, payload)
      return data
    },
    onSuccess: (res) => {
      toast.success(res.message)
      qc.invalidateQueries({ queryKey: [ASSETS_KEY] })
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useDeleteAsset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.delete<ApiResponse<null>>(`/asset/${id}`)
      return data
    },
    onSuccess: (res) => {
      toast.success(res.message)
      qc.invalidateQueries({ queryKey: [ASSETS_KEY] })
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useAssetContracts(assetId: string | null) {
  return useQuery({
    queryKey: [ASSETS_KEY, "contracts", assetId],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<ContractListItem>>(
        "/contract/list",
        { params: { asset_id: assetId, limit: 50, sort_by: "end_date", sort_order: "asc" } }
      )
      return data
    },
    enabled: !!assetId,
  })
}
