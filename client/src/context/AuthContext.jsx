import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import AuthContext from './auth-context'
import api, { API_BASE_URL, clearAccessToken, configureAuthHandlers, setAccessToken } from '../utils/api'

export function AuthProvider({ children }) {
  const location = useLocation()
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)
  const pendingRefreshRef = useRef(null)
  const hasBootstrappedRef = useRef(false)

  const applySession = useCallback((session) => {
    setAccessToken(session.access_token)
    setToken(session.access_token)
    setUser(session.user)
    return session.access_token
  }, [])

  const clearSession = useCallback(() => {
    clearAccessToken()
    setToken(null)
    setUser(null)
    setLoading(false)
  }, [])

  const refreshSession = useCallback(async () => {
    const res = await api.post('/auth/refresh')
    return applySession(res.data)
  }, [applySession])

  useEffect(() => {
    configureAuthHandlers({
      onRefresh: refreshSession,
      onAuthFailure: async () => {
        clearSession()
      },
    })
  }, [refreshSession, clearSession])

  useEffect(() => {
    let cancelled = false

    const bootstrapAuth = async () => {
      if (hasBootstrappedRef.current) {
        setLoading(false)
        return
      }

      if (location.pathname === '/') {
        setLoading(false)
        return
      }

      hasBootstrappedRef.current = true

      try {
        if (!pendingRefreshRef.current) {
          pendingRefreshRef.current = refreshSession()
        }
        const refreshedToken = await pendingRefreshRef.current
        if (cancelled) return
        setToken(refreshedToken)
      } catch {
        if (cancelled) return
        clearSession()
        return
      } finally {
        pendingRefreshRef.current = null
      }

      if (!cancelled) {
        setLoading(false)
      }
    }

    bootstrapAuth()

    return () => {
      cancelled = true
    }
  }, [location.pathname, refreshSession, clearSession])

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password })
    applySession(res.data)
    setLoading(false)
    return res.data.user
  }

  const register = async (name, email, password) => {
    const res = await api.post('/auth/register', { name, email, password })
    applySession(res.data)
    setLoading(false)
    return res.data.user
  }

  const logout = async () => {
    try {
      await api.post('/auth/logout')
    } catch {
      // Session cleanup should still happen locally even if the network request fails.
    }
    clearSession()
  }

  const startOAuth = async (provider) => {
    window.location.href = `${API_BASE_URL.replace(/\/api\/?$/, '')}/api/auth/${provider}/login`
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        startOAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
