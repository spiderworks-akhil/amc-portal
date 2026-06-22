"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useSession } from "next-auth/react"
import apiClient from "@/lib/api-client"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

export interface NotificationEvent {
  id: string
  type: string
  title: string
  message: string | null
  link: string | null
  severity: "info" | "warning" | "critical"
  created_at: string
  is_read: boolean
}

const NOTIFICATIONS_KEY = "in-app-notifications"
const UNREAD_COUNT_KEY = "in-app-notifications-unread"

/**
 * Plays a subtle notification chime using the Web Audio API.
 * No external audio files needed.
 */
function playNotificationSound() {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()

    // Create a gentle two-tone chime
    const oscillator = audioCtx.createOscillator()
    const gainNode = audioCtx.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioCtx.destination)

    oscillator.type = "sine"
    oscillator.frequency.setValueAtTime(880, audioCtx.currentTime) // A5
    oscillator.frequency.setValueAtTime(1108.73, audioCtx.currentTime + 0.1) // C#6

    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4)

    oscillator.start(audioCtx.currentTime)
    oscillator.stop(audioCtx.currentTime + 0.4)

    // Clean up after sound finishes
    oscillator.onended = () => audioCtx.close()
  } catch {
    // Audio not supported — silently ignore
  }
}

/**
 * Hook that manages SSE connection for real-time notifications
 * and provides query/mutation helpers for the notifications API.
 */
export function useInAppNotifications() {
  const { data: session } = useSession()
  const userId = session?.user?.id
  const accessToken = session?.accessToken
  const queryClient = useQueryClient()
  const eventSourceRef = useRef<AbortController | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isConnectedRef = useRef(false)
  const lastNotificationRef = useRef<string | null>(null)

  // Callback for new SSE events - shows toast + sound, invalidates queries
  const handleNewNotification = useCallback((notification: NotificationEvent) => {
    // Deduplicate — skip if we already handled this notification ID
    if (lastNotificationRef.current === notification.id) return
    lastNotificationRef.current = notification.id

    // Invalidate queries to update badge count and list
    queryClient.invalidateQueries({ queryKey: [NOTIFICATIONS_KEY] })
    queryClient.invalidateQueries({ queryKey: [UNREAD_COUNT_KEY] })

    // Play notification sound
    playNotificationSound()

    // Show toast notification
    const emoji = notification.severity === "critical" ? "🔴" : notification.severity === "warning" ? "🟡" : "🔵"
    const message = notification.message
      ? `${emoji} ${notification.title}\n${notification.message}`
      : `${emoji} ${notification.title}`

    toast(message, {
      duration: 5000,
      description: notification.message ?? undefined,
      action: notification.link
        ? {
            label: "View",
            onClick: () => {
              window.location.href = notification.link!
            },
          }
        : undefined,
    })
  }, [queryClient])

  // Connect to SSE stream
  useEffect(() => {
    if (!accessToken || !userId) return

    let cancelled = false

    async function connectSSE() {
      if (cancelled) return

      const controller = new AbortController()
      eventSourceRef.current = controller

      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/notifications/stream`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: "text/event-stream",
            },
            signal: controller.signal,
          }
        )

        if (!response.ok) {
          throw new Error(`SSE connection failed: ${response.status}`)
        }

        isConnectedRef.current = true

        const reader = response.body?.getReader()
        if (!reader) {
          throw new Error("No readable stream available")
        }

        const decoder = new TextDecoder()
        let buffer = ""

        while (true) {
          const { done, value } = await reader.read()
          if (done || cancelled) break

          buffer += decoder.decode(value, { stream: true })

          // Parse SSE events from buffer
          const lines = buffer.split("\n")
          buffer = lines.pop() || "" // Keep incomplete line in buffer

          let currentEvent = ""
          let currentData = ""

          for (const line of lines) {
            if (line.startsWith("event: ")) {
              currentEvent = line.slice(7).trim()
            } else if (line.startsWith("data: ")) {
              currentData = line.slice(6).trim()
            } else if (line === "" && currentData) {
              // Empty line means end of event
              if (currentEvent === "notification") {
                try {
                  const notification: NotificationEvent = JSON.parse(currentData)
                  handleNewNotification(notification)
                } catch {
                  // Skip malformed events
                }
              }
              currentEvent = ""
              currentData = ""
            }
          }
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") {
          // Component unmounted, clean exit
          return
        }
        isConnectedRef.current = false

        // Reconnect after delay
        if (!cancelled) {
          reconnectTimeoutRef.current = setTimeout(connectSSE, 5000)
        }
      }
    }

    connectSSE()

    return () => {
      cancelled = true
      isConnectedRef.current = false
      if (eventSourceRef.current) {
        eventSourceRef.current.abort()
        eventSourceRef.current = null
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
    }
  }, [accessToken, userId, handleNewNotification])

  // ── Query: list notifications ──

  const useNotificationsList = (page = 1, limit = 50) =>
    useQuery({
      queryKey: [NOTIFICATIONS_KEY, page, limit],
      queryFn: async () => {
        const { data } = await apiClient.get<{
          data: NotificationEvent[]
          meta: { total: number; page: number; limit: number }
        }>("/notifications", { params: { page, limit } })
        return data
      },
      enabled: !!userId,
    })

  // ── Query: unread count ──

  const useUnreadCount = () =>
    useQuery({
      queryKey: [UNREAD_COUNT_KEY],
      queryFn: async () => {
        const { data } = await apiClient.get<{ count: number }>("/notifications/unread-count")
        return data.count
      },
      enabled: !!userId,
      refetchInterval: 60_000, // Poll every minute as fallback
    })

  // ── Mutation: mark as read ──

  const useMarkAsRead = () =>
    useMutation({
      mutationFn: async (notificationId: string) => {
        await apiClient.patch(`/notifications/${notificationId}/read`)
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [NOTIFICATIONS_KEY] })
        queryClient.invalidateQueries({ queryKey: [UNREAD_COUNT_KEY] })
      },
    })

  // ── Mutation: mark all as read ──

  const useMarkAllAsRead = () =>
    useMutation({
      mutationFn: async () => {
        await apiClient.patch("/notifications/read-all")
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [NOTIFICATIONS_KEY] })
        queryClient.invalidateQueries({ queryKey: [UNREAD_COUNT_KEY] })
      },
    })

  return {
    useNotificationsList,
    useUnreadCount,
    useMarkAsRead,
    useMarkAllAsRead,
    isConnected: isConnectedRef.current,
  }
}
