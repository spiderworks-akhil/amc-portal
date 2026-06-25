"use client"

import { useQuery } from "@tanstack/react-query"
import apiClient from "@/lib/api-client"
import type { QueueStats } from "@/types/api"

const QUEUES_KEY = "admin-queues"

export function useQueueStats() {
  return useQuery({
    queryKey: [QUEUES_KEY, "stats"],
    queryFn: async () => {
      const { data } = await apiClient.get<QueueStats>("/admin/queues")
      return data
    },
    refetchInterval: 15_000, // auto-refresh every 15s
  })
}
