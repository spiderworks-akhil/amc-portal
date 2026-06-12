"use client"

import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import apiClient from "@/lib/api-client"
import type { ApiResponse, Provider } from "@/types/api"

export function useCreateProvider() {
  return useMutation({
    mutationFn: async (payload: { name: string; type: string; website?: string; notes?: string }) => {
      const { data } = await apiClient.post<ApiResponse<Provider>>("/provider", payload)
      return data
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
