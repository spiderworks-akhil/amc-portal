"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import apiClient from "@/lib/api-client"
import type {
  ApiResponse,
  CreateReminderPayload,
  CreateReminderRulePayload,
  ListRemindersParams,
  ReminderListItem,
  ReminderRuleListItem,
  PaginatedResponse,
  UpdateReminderPayload,
  UpdateReminderRulePayload,
} from "@/types/api"

const REMINDERS_KEY = "reminders"
const RULES_KEY = "reminder-rules"

// ── Reminders ──

export function useReminders(params: ListRemindersParams) {
  return useQuery({
    queryKey: [REMINDERS_KEY, "list", params],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<ReminderListItem>>("/reminder", { params })
      return data
    },
    placeholderData: (prev) => prev,
  })
}

export function useReminder(id: string | null) {
  return useQuery({
    queryKey: [REMINDERS_KEY, id],
    queryFn: async () => {
      const { data } = await apiClient.get<ReminderListItem>(`/reminder/${id}`)
      return data
    },
    enabled: !!id,
  })
}

export function useUpcomingReminders(days = 7) {
  return useQuery({
    queryKey: [REMINDERS_KEY, "upcoming", days],
    queryFn: async () => {
      const { data } = await apiClient.get<{ data: ReminderListItem[] }>("/reminder/upcoming", {
        params: { days },
      })
      return data.data
    },
  })
}

export function useCreateReminder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateReminderPayload) => {
      const { data } = await apiClient.post<ApiResponse<ReminderListItem>>("/reminder", payload)
      return data
    },
    onSuccess: () => {
      toast.success("Reminder created")
      qc.invalidateQueries({ queryKey: [REMINDERS_KEY] })
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUpdateReminder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: UpdateReminderPayload & { id: string }) => {
      const { data } = await apiClient.patch<ApiResponse<ReminderListItem>>(`/reminder/${id}`, payload)
      return data
    },
    onSuccess: () => {
      toast.success("Reminder updated")
      qc.invalidateQueries({ queryKey: [REMINDERS_KEY] })
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useDeleteReminder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.delete<ApiResponse<{ message: string }>>(`/reminder/${id}`)
      return data
    },
    onSuccess: () => {
      toast.success("Reminder deleted")
      qc.invalidateQueries({ queryKey: [REMINDERS_KEY] })
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

// ── Reminder Rules ──

export function useReminderRules(enabled?: string) {
  return useQuery({
    queryKey: [RULES_KEY, "list", enabled],
    queryFn: async () => {
      const params: Record<string, unknown> = {}
      if (enabled !== undefined) params.enabled = enabled
      const { data } = await apiClient.get<{ data: ReminderRuleListItem[] }>("/reminder-rules", { params })
      return data.data
    },
  })
}

export function useReminderRule(id: string | null) {
  return useQuery({
    queryKey: [RULES_KEY, id],
    queryFn: async () => {
      const { data } = await apiClient.get<ReminderRuleListItem>(`/reminder-rules/${id}`)
      return data
    },
    enabled: !!id,
  })
}

export function useCreateReminderRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateReminderRulePayload) => {
      const { data } = await apiClient.post<ApiResponse<ReminderRuleListItem>>("/reminder-rules", payload)
      return data
    },
    onSuccess: () => {
      toast.success("Reminder rule created")
      qc.invalidateQueries({ queryKey: [RULES_KEY] })
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUpdateReminderRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: UpdateReminderRulePayload & { id: string }) => {
      const { data } = await apiClient.patch<ApiResponse<ReminderRuleListItem>>(`/reminder-rules/${id}`, payload)
      return data
    },
    onSuccess: () => {
      toast.success("Reminder rule updated")
      qc.invalidateQueries({ queryKey: [RULES_KEY] })
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useDeleteReminderRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.delete<ApiResponse<{ message: string }>>(`/reminder-rules/${id}`)
      return data
    },
    onSuccess: () => {
      toast.success("Reminder rule deleted")
      qc.invalidateQueries({ queryKey: [RULES_KEY] })
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
