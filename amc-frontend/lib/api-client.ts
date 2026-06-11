import axios from "axios"
import { getSession, signOut } from "next-auth/react"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"

// In-memory token cache — updated on refresh so the request interceptor
// never reads a stale accessToken from the NextAuth session cookie.
let currentAccessToken: string | null = null

// Track if we're already refreshing to avoid infinite loops
let isRefreshing = false
let failedQueue: Array<{
  resolve: (token: string) => void
  reject: (err: unknown) => void
}> = []

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error)
    } else if (token) {
      promise.resolve(token)
    }
  })
  failedQueue = []
}

async function refreshAccessToken(): Promise<string | null> {
  try {
    const token = currentAccessToken
    if (!token) return null

    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      credentials: "include",
    })

    if (!res.ok) return null

    const data = await res.json()
    return data?.token ?? null
  } catch {
    return null
  }
}

const apiClient = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
})

// Request interceptor: attach auth token (uses in-memory cache first)
apiClient.interceptors.request.use(async (config) => {
  if (currentAccessToken) {
    config.headers.Authorization = `Bearer ${currentAccessToken}`
    return config
  }
  const session = await getSession()
  if (session?.accessToken) {
    currentAccessToken = session.accessToken
    config.headers.Authorization = `Bearer ${session.accessToken}`
  }
  return config
})

// Response interceptor: handle 401 with token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // Only handle 401s and don't retry refresh/logout endpoints
    if (
      error.response?.status !== 401 ||
      originalRequest?._retry ||
      originalRequest?.url?.includes("/auth/refresh") ||
      originalRequest?.url?.includes("/auth/logout")
    ) {
      return Promise.reject(error)
    }

    // If already refreshing, queue this request
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({
          resolve: (newToken: string) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`
            resolve(apiClient(originalRequest))
          },
          reject,
        })
      })
    }

    originalRequest._retry = true
    isRefreshing = true

    try {
      const newToken = await refreshAccessToken()

      if (newToken) {
        // Update in-memory cache so subsequent requests use the fresh token
        currentAccessToken = newToken
        processQueue(null, newToken)
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return apiClient(originalRequest)
      }

      // Refresh failed — sign out
      currentAccessToken = null
      processQueue(new Error("Session expired"), null)
      await signOut({ redirect: true, callbackUrl: "/login" })
      return Promise.reject(error)
    } catch {
      processQueue(error, null)
      await signOut({ redirect: true, callbackUrl: "/login" })
      return Promise.reject(error)
    } finally {
      isRefreshing = false
    }
  },
)

export default apiClient
