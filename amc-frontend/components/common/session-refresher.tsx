"use client"

import { useEffect, useRef } from "react"
import { useSession } from "next-auth/react"

const REFRESH_INTERVAL = 45 * 60 * 1000 // 45 minutes

/**
 * Proactively refreshes the JWT token every 45 minutes (before the 1h expiry)
 * so API calls never hit a 401 due to token expiry.
 *
 * Uses NextAuth's update() to persist the new token into the JWT so
 * getSession() and api-client.ts always have a fresh accessToken.
 */
export function SessionRefresher() {
  const { data: session, update } = useSession()
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const refresh = async () => {
      const token = session?.accessToken
      if (!token) return

      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"
        const res = await fetch(`${API_URL}/auth/refresh`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })

        if (!res.ok) return

        const data = await res.json()
        if (data?.token) {
          // Persist the new token into the NextAuth JWT so getSession()
          // and the axios interceptor always use the latest token.
          await update({ accessToken: data.token })
        }
      } catch {
        // Silent fail — 401 interceptor in api-client.ts handles it
      }
    }

    // Initial refresh shortly after mount (8s delay to let session stabilize)
    const initialTimer = setTimeout(refresh, 8000)
    intervalRef.current = setInterval(refresh, REFRESH_INTERVAL)

    return () => {
      clearTimeout(initialTimer)
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [session?.accessToken, update])

  return null
}
