"use client"

import { useQuery } from "@tanstack/react-query"
import apiClient from "@/lib/api-client"
import type { Provider } from "@/types/api"

const PROVIDERS_KEY = "providers"

export function useProviders() {
  return useQuery({
    queryKey: [PROVIDERS_KEY, "list"],
    queryFn: async () => {
      const { data } = await apiClient.get<{ data: Provider[]; meta: { total: number } }>(
        "/provider/list",
        { params: { limit: 200, sort_by: "name", sort_order: "asc" } }
      )
      return data
    },
    staleTime: 300_000,
  })
}
