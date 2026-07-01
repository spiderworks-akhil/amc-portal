"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import apiClient from "@/lib/api-client"
import type { ApiResponse, Provider } from "@/types/api"

export function useCreateProvider() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { name: string; type: string; website?: string; notes?: string }) => {
      const { data } = await apiClient.post<ApiResponse<Provider>>("/provider", payload)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["providers"] })
      toast.success("Provider created")
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
