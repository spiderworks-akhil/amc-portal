"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import apiClient from "@/lib/api-client"
import type { AppConfig, SmtpConfig, WhatsAppConfig } from "@/types/api"

const CONFIG_KEY = "config"

export function useConfig(group: string) {
  return useQuery({
    queryKey: [CONFIG_KEY, group],
    queryFn: async () => {
      const { data } = await apiClient.get<AppConfig>(`/config/${group}`)
      return data
    },
  })
}

export function useUpdateSmtpConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: SmtpConfig) => {
      const { data } = await apiClient.put<AppConfig>("/config/smtp", payload)
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [CONFIG_KEY] })
      toast.success("SMTP config updated")
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUpdateWhatsAppConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: WhatsAppConfig) => {
      const { data } = await apiClient.put<AppConfig>("/config/whatsapp", payload)
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [CONFIG_KEY] })
      toast.success("WhatsApp config updated")
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
