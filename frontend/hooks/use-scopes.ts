"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import apiClient from "@/lib/api-client"
import type { Scope, ApiResponse } from "@/types/api"

const SCOPES_KEY = "scopes"

export function useScopes() {
  return useQuery({
    queryKey: [SCOPES_KEY],
    queryFn: async () => {
      const { data } = await apiClient.get<Scope[]>("/scopes")
      return data
    },
  })
}

export function useScopesForProject(projectId: string | null) {
  return useQuery({
    queryKey: [SCOPES_KEY, "asset", projectId],
    queryFn: async () => {
      const { data } = await apiClient.get<Scope[]>(`/scopes/asset/${projectId}`)
      return data
    },
    enabled: !!projectId,
  })
}

export function useCreateScope() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { name: string; description?: string; color?: string }) => {
      const { data } = await apiClient.post<ApiResponse<Scope>>("/scopes", payload)
      return data
    },
    onSuccess: (res) => {
      toast.success(res.message)
      qc.invalidateQueries({ queryKey: [SCOPES_KEY] })
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useLinkScopesToProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ projectId, scope_ids }: { projectId: string; scope_ids: string[] }) => {
      const { data } = await apiClient.post(`/scopes/asset/${projectId}`, { scope_ids })
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [SCOPES_KEY] })
      qc.invalidateQueries({ queryKey: ["projects"] })
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUnlinkScopesFromProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ projectId, scope_ids }: { projectId: string; scope_ids: string[] }) => {
      const { data } = await apiClient.delete(`/scopes/asset/${projectId}`, { data: { scope_ids } })
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [SCOPES_KEY] })
      qc.invalidateQueries({ queryKey: ["projects"] })
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useScopesForContract(contractId: string | null) {
  return useQuery({
    queryKey: [SCOPES_KEY, "contract", contractId],
    queryFn: async () => {
      const { data } = await apiClient.get<Scope[]>(`/scopes/contract/${contractId}`)
      return data
    },
    enabled: !!contractId,
  })
}

export function useLinkScopesToContract() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ contractId, scope_ids }: { contractId: string; scope_ids: string[] }) => {
      const { data } = await apiClient.post(`/scopes/contract/${contractId}`, { scope_ids })
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [SCOPES_KEY] })
      qc.invalidateQueries({ queryKey: ["contracts"] })
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUnlinkScopesFromContract() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ contractId, scope_ids }: { contractId: string; scope_ids: string[] }) => {
      const { data } = await apiClient.delete(`/scopes/contract/${contractId}`, { data: { scope_ids } })
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [SCOPES_KEY] })
      qc.invalidateQueries({ queryKey: ["contracts"] })
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
