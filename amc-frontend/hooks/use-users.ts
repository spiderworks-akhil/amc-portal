"use client"

import { useQuery } from "@tanstack/react-query"
import apiClient from "@/lib/api-client"
import type { PaginatedResponse, UserListItem, ListUsersParams } from "@/types/api"

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
