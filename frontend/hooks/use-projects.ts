"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import apiClient from "@/lib/api-client"
import type {
  ProjectListItem,
  ProjectDetail,
  PaginatedResponse,
  ApiResponse,
  CreateProjectPayload,
  UpdateProjectPayload,
  ListProjectsParams,
  ContractListItem,
} from "@/types/api"

const PROJECTS_KEY = "projects"

export function useProjects(params: ListProjectsParams) {
  return useQuery({
    queryKey: [PROJECTS_KEY, "list", params],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<ProjectListItem>>("/asset/list", { params })
      return data
    },
    placeholderData: (prev) => prev,
  })
}

export function useClientProjects(clientId: string | null) {
  return useQuery({
    queryKey: [PROJECTS_KEY, "by-client", clientId],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<ProjectListItem>>(
        "/asset/list",
        { params: { client_id: clientId, limit: 100, sort_by: "name", sort_order: "asc" } }
      )
      return data
    },
    enabled: !!clientId,
  })
}

export function useProject(id: string | null) {
  return useQuery({
    queryKey: [PROJECTS_KEY, id],
    queryFn: async () => {
      const { data } = await apiClient.get<ProjectDetail>(`/asset/${id}`)
      return data
    },
    enabled: !!id,
  })
}

export function useCreateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateProjectPayload) => {
      const { data } = await apiClient.post<ApiResponse<ProjectListItem>>("/asset", payload)
      return data
    },
    onSuccess: (res) => {
      toast.success(res.message)
      qc.invalidateQueries({ queryKey: [PROJECTS_KEY] })
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUpdateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: UpdateProjectPayload & { id: string }) => {
      const { data } = await apiClient.put<ApiResponse<ProjectListItem>>(`/asset/${id}`, payload)
      return data
    },
    onSuccess: (res) => {
      toast.success(res.message)
      qc.invalidateQueries({ queryKey: [PROJECTS_KEY] })
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useDeleteProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.delete<ApiResponse<null>>(`/asset/${id}`)
      return data
    },
    onSuccess: (res) => {
      toast.success(res.message)
      qc.invalidateQueries({ queryKey: [PROJECTS_KEY] })
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useProjectContracts(projectId: string | null) {
  return useQuery({
    queryKey: [PROJECTS_KEY, "contracts", projectId],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<ContractListItem>>(
        "/contract/list",
        { params: { asset_id: projectId, limit: 50, sort_by: "end_date", sort_order: "asc" } }
      )
      return data
    },
    enabled: !!projectId,
  })
}
