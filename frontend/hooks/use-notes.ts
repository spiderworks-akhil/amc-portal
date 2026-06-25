"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import apiClient from "@/lib/api-client"
import type { Note, PaginatedResponse, ApiResponse } from "@/types/api"

const NOTES_KEY = "notes"

export function useNotes(noteableType: string, noteableId: string) {
  return useQuery({
    queryKey: [NOTES_KEY, noteableType, noteableId],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<Note>>("/notes/list", {
        params: { noteable_type: noteableType, noteable_id: noteableId, limit: 100 },
      })
      return data
    },
    enabled: !!noteableType && !!noteableId,
  })
}

export function useCreateNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      noteable_type: string
      noteable_id: string
      content: string
    }) => {
      const { data } = await apiClient.post<ApiResponse<Note>>("/notes", payload)
      return data
    },
    onSuccess: (res) => {
      toast.success(res.message)
      qc.invalidateQueries({ queryKey: [NOTES_KEY] })
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUpdateNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { id: string; content: string }) => {
      const { data } = await apiClient.patch<ApiResponse<Note>>(`/notes/${payload.id}`, {
        content: payload.content,
      })
      return data
    },
    onSuccess: (res) => {
      toast.success(res.message)
      qc.invalidateQueries({ queryKey: [NOTES_KEY] })
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useDeleteNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.delete(`/notes/${id}`)
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [NOTES_KEY] })
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
