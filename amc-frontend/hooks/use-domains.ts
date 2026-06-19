"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import apiClient from "@/lib/api-client"
import type { ApiResponse, CreateDomainPayload, DomainDetail, DomainListItem, PaginatedResponse, UpdateDomainPayload } from "@/types/api"

const DOMAINS_KEY = "domains"

/** Result from the lookup-details endpoint */
export interface DomainLookupResult {
  valid: boolean
  fqdn: string
  nameservers: string[]
  registered_date?: string
  expiry_date?: string
  registrar?: string
  registrar_id?: string
  error?: string
}

/** Verify a domain FQDN resolves in DNS — used for inline validation in forms */
export async function verifyDomainFqdn(fqdn: string): Promise<{ valid: boolean; error?: string }> {
  try {
    await apiClient.get("/domain/verify-fqdn", { params: { fqdn } })
    return { valid: true }
  } catch (err: unknown) {
    const msg =
      err && typeof err === "object" && "response" in err
        ? (err as { response: { data?: { message?: string } } }).response?.data?.message
        : undefined
    return { valid: false, error: msg || "Domain does not resolve" }
  }
}

/** Look up domain details — verifies resolution and fetches nameservers */
export async function lookupDomainDetails(fqdn: string): Promise<DomainLookupResult> {
  const { data } = await apiClient.get<DomainLookupResult>("/domain/verify-fqdn", { params: { fqdn } })
  return data
}

export function useDomain(id: string | null) {
  return useQuery({
    queryKey: [DOMAINS_KEY, id],
    queryFn: async () => {
      const { data } = await apiClient.get<DomainDetail>(`/domain/${id}`)
      return data
    },
    enabled: !!id,
  })
}

export function useDomains(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: [DOMAINS_KEY, "list", params],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<DomainListItem>>("/domain/list", { params })
      return data
    },
  })
}

export function useCreateDomain() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateDomainPayload) => {
      const { data } = await apiClient.post<ApiResponse<DomainListItem>>("/domain", payload)
      return data
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: [DOMAINS_KEY] })
      qc.invalidateQueries({ queryKey: ["assets"] })
      toast.success(res?.message ?? "Domain created successfully")
    },
    onError: (err: unknown) => {
      // Extract the most meaningful error message from various error shapes
      let message = "Failed to create domain"
      if (err && typeof err === "object") {
        const axiosErr = err as { response?: { data?: { message?: string } }; message?: string }
        message = axiosErr.response?.data?.message
          ?? axiosErr.message
          ?? message
      }
      toast.error(message)
    },
  })
}

export function useUpdateDomain() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: UpdateDomainPayload & { id: string }) => {
      const { data } = await apiClient.put<ApiResponse<DomainListItem>>(`/domain/${id}`, payload)
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [DOMAINS_KEY] })
      qc.invalidateQueries({ queryKey: ["assets"] })
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useDeleteDomain() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.delete<ApiResponse<{ message: string }>>(`/domain/${id}`)
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [DOMAINS_KEY] })
      qc.invalidateQueries({ queryKey: ["assets"] })
      toast.success("Domain deleted")
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
