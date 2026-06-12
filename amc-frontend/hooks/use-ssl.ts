"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import apiClient from "@/lib/api-client"
import type { ApiResponse, CreateSslPayload, PaginatedResponse, SslDetail, SslListItem, UpdateSslPayload } from "@/types/api"

export interface SslLookupResult {
  issuer: string | null
  common_name: string | null
  sans: string[]
  valid_from: string | null
  valid_to: string | null
  type: string | null
}

/** Look up live SSL certificate details from a hostname via TLS */
export async function lookupSslCertDetails(hostname: string): Promise<SslLookupResult> {
  const { data } = await apiClient.get<SslLookupResult>("/ssl/lookup-details", { params: { hostname } })
  return data
}

const SSL_KEY = "ssl"

export function useSslCertificates(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: [SSL_KEY, "list", params],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<SslListItem>>("/ssl/list", { params })
      return data
    },
  })
}

export function useSslCertificate(id: string | null) {
  return useQuery({
    queryKey: [SSL_KEY, id],
    queryFn: async () => {
      const { data } = await apiClient.get<SslDetail>(`/ssl/${id}`)
      return data
    },
    enabled: !!id,
  })
}

export function useCreateSsl() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateSslPayload) => {
      const { data } = await apiClient.post<ApiResponse<unknown>>("/ssl", payload)
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [SSL_KEY] })
      qc.invalidateQueries({ queryKey: ["assets"] })
      qc.invalidateQueries({ queryKey: ["domains"] })
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUpdateSsl() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: UpdateSslPayload & { id: string }) => {
      const { data } = await apiClient.put<ApiResponse<unknown>>(`/ssl/${id}`, payload)
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [SSL_KEY] })
      qc.invalidateQueries({ queryKey: ["assets"] })
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useDeleteSsl() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.delete<ApiResponse<{ message: string }>>(`/ssl/${id}`)
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [SSL_KEY] })
      qc.invalidateQueries({ queryKey: ["assets"] })
      toast.success("SSL certificate deleted")
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
