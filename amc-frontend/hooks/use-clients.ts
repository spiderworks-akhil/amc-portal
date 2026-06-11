"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import apiClient from "@/lib/api-client"
import type {
  ClientListItem,
  ClientDetail,
  Contact,
  PaginatedResponse,
  ApiResponse,
  CreateClientPayload,
  UpdateClientPayload,
  CreateContactPayload,
  UpdateContactPayload,
  ListClientsParams,
  SyncSummary,
} from "@/types/api"

const CLIENTS_KEY = "clients"

function clientsKey(params?: ListClientsParams) {
  return params ? [CLIENTS_KEY, params] : [CLIENTS_KEY]
}

export function useClients(params: ListClientsParams) {
  return useQuery({
    queryKey: clientsKey(params),
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<ClientListItem>>("/client/list", { params })
      return data
    },
    placeholderData: (prev) => prev,
  })
}

export function useClient(id: string | null) {
  return useQuery({
    queryKey: [CLIENTS_KEY, id],
    queryFn: async () => {
      const { data } = await apiClient.get<ClientDetail>(`/client/${id}`)
      return data
    },
    enabled: !!id,
  })
}

export function useCreateClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateClientPayload) => {
      const { data } = await apiClient.post<ApiResponse<ClientDetail>>("/client", payload)
      return data
    },
    onSuccess: (res) => {
      toast.success(res.message)
      qc.invalidateQueries({ queryKey: [CLIENTS_KEY] })
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUpdateClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: UpdateClientPayload & { id: string }) => {
      const { data } = await apiClient.put<ApiResponse<ClientDetail>>(`/client/${id}`, payload)
      return data
    },
    onSuccess: (res) => {
      toast.success(res.message)
      qc.invalidateQueries({ queryKey: [CLIENTS_KEY] })
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useDeleteClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.delete<ApiResponse<null>>(`/client/${id}`)
      return data
    },
    onSuccess: (res) => {
      toast.success(res.message)
      qc.invalidateQueries({ queryKey: [CLIENTS_KEY] })
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useSyncClients() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post<ApiResponse<{ summary: SyncSummary }>>("/client/sync")
      return data
    },
    onSuccess: (res) => {
      toast.success(res.message)
      qc.invalidateQueries({ queryKey: [CLIENTS_KEY] })
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useAddContact(clientId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateContactPayload) => {
      const { data } = await apiClient.post<ApiResponse<Contact>>(`/client/${clientId}/contacts`, payload)
      return data
    },
    onSuccess: (res) => {
      toast.success(res.message)
      qc.invalidateQueries({ queryKey: [CLIENTS_KEY, clientId] })
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUpdateContact(clientId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ contactId, ...payload }: UpdateContactPayload & { contactId: string }) => {
      const { data } = await apiClient.put<ApiResponse<Contact>>(`/client/contacts/${contactId}`, payload)
      return data
    },
    onSuccess: () => {
      toast.success("Contact updated successfully")
      qc.invalidateQueries({ queryKey: [CLIENTS_KEY, clientId] })
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useDeleteContact(clientId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (contactId: string) => {
      const { data } = await apiClient.delete<ApiResponse<null>>(`/client/contacts/${contactId}`)
      return data
    },
    onSuccess: (res) => {
      toast.success(res.message)
      qc.invalidateQueries({ queryKey: [CLIENTS_KEY, clientId] })
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useAddManagers(clientId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (manager_ids: string[]) => {
      const { data } = await apiClient.post(`/client/${clientId}/managers`, { manager_ids })
      return data
    },
    onSuccess: () => {
      toast.success("Managers assigned successfully")
      qc.invalidateQueries({ queryKey: [CLIENTS_KEY, clientId] })
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useAvailableManagers() {
  return useQuery({
    queryKey: ["available-managers"],
    queryFn: async () => {
      const { data } = await apiClient.get<Array<{ id: string; name: string; email: string }>>("/users")
      return data
    },
    staleTime: 60_000,
  })
}

export function useRemoveManagers(clientId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (manager_ids: string[]) => {
      const { data } = await apiClient.delete(`/client/${clientId}/managers`, { data: { manager_ids } })
      return data
    },
    onSuccess: () => {
      toast.success("Managers removed successfully")
      qc.invalidateQueries({ queryKey: [CLIENTS_KEY, clientId] })
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
