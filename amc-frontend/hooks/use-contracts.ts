"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import apiClient from "@/lib/api-client"
import type { ApiResponse, CreateContractPayload, UpdateContractPayload, ContractListItem, ContractDetail, PaginatedResponse } from "@/types/api"

const CONTRACTS_KEY = "contracts"

export function useContract(id: string | null) {
  return useQuery({
    queryKey: [CONTRACTS_KEY, id],
    queryFn: async () => {
      const { data } = await apiClient.get<ContractDetail>(`/contract/${id}`)
      return data
    },
    enabled: !!id,
  })
}

export function useContracts(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: [CONTRACTS_KEY, "list", params],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<ContractListItem>>("/contract/list", { params })
      return data
    },
  })
}

export function useCreateContract() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateContractPayload) => {
      const { data } = await apiClient.post<ApiResponse<ContractListItem>>("/contract", payload)
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [CONTRACTS_KEY] })
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUpdateContract() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: UpdateContractPayload & { id: string }) => {
      const { data } = await apiClient.put<ApiResponse<ContractListItem>>(`/contract/${id}`, payload)
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [CONTRACTS_KEY] })
      toast.success("Contract updated")
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useLinkAssetToContract() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ contractId, asset_ids }: { contractId: string; asset_ids: string[] }) => {
      const { data } = await apiClient.post<ApiResponse<{ inserted: number }>>(
        `/contract/${contractId}/assets`,
        { asset_ids }
      )
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assets"] })
      qc.invalidateQueries({ queryKey: [CONTRACTS_KEY] })
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
