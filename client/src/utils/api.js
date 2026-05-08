import axios from 'axios'

function resolveApiBaseUrl() {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL
  }

  if (typeof window === 'undefined') {
    return 'http://127.0.0.1:5000/api'
  }

  const { hostname, protocol } = window.location
  const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1'

  if (isLocalHost) {
    return `${protocol}//${hostname}:5000/api`
  }

  const apexDomain = hostname.replace(/^www\./, '')
  return `https://api.${apexDomain}/api`
}

export const API_BASE_URL = resolveApiBaseUrl()

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

let accessToken = null
let refreshHandler = null
let authFailureHandler = null
let refreshPromise = null

const isAuthEndpoint = (url = '') => (
  url.includes('/auth/login') ||
  url.includes('/auth/register') ||
  url.includes('/auth/refresh') ||
  url.includes('/auth/logout') ||
  url.includes('/auth/oauth/')
)

export function setAccessToken(token) {
  accessToken = token

  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`
  } else {
    delete api.defaults.headers.common.Authorization
  }
}

export function clearAccessToken() {
  setAccessToken(null)
}

export function configureAuthHandlers({ onRefresh, onAuthFailure }) {
  refreshHandler = onRefresh
  authFailureHandler = onAuthFailure
}

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers = config.headers ?? {}
    if (!config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${accessToken}`
    }
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config ?? {}

    if (!error.response || error.response.status !== 401) {
      return Promise.reject(error)
    }

    if (isAuthEndpoint(originalRequest.url) || originalRequest._retry || !refreshHandler) {
      return Promise.reject(error)
    }

    originalRequest._retry = true

    try {
      if (!refreshPromise) {
        refreshPromise = Promise.resolve(refreshHandler()).finally(() => {
          refreshPromise = null
        })
      }

      const newAccessToken = await refreshPromise
      if (!newAccessToken) {
        throw error
      }

      originalRequest.headers = originalRequest.headers ?? {}
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
      return api(originalRequest)
    } catch (refreshError) {
      if (authFailureHandler) {
        await authFailureHandler()
      }
      return Promise.reject(refreshError)
    }
  }
)

export default api
