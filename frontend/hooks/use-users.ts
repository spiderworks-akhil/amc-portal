"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import apiClient from "@/lib/api-client"
import type { PaginatedResponse, UserListItem, ListUsersParams, UpdateUserPayload, ApiResponse } from "@/types/api"

const USERS_KEY = "users"

export function useUsers(params: ListUsersParams) {
  return useQuery({
    queryKey: [USERS_KEY, params],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<UserListItem>>("/users/list", { params })
      return data
    },
    placeholderData: (prev) => prev,
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...payload }: UpdateUserPayload & { id: string }) => {
      const { data } = await apiClient.patch<ApiResponse<unknown>>(`/users/${id}`, payload)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [USERS_KEY] })
    },
  })
}
