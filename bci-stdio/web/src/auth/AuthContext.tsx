import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { fetchMe, type AuthUser } from '../lib/api'

type AuthState = {
  token: string | null
  user: AuthUser | null
  loading: boolean
  setSession: (token: string, user: AuthUser) => void
  logout: () => void
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)
const TOKEN_KEY = 'bci_stdio_token'
const USER_KEY = 'bci_stdio_user'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY))
  const [user, setUser] = useState<AuthUser | null>(() => {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? (JSON.parse(raw) as AuthUser) : null
  })
  const [loading, setLoading] = useState(Boolean(token))

  const setSession = useCallback((nextToken: string, nextUser: AuthUser) => {
    localStorage.setItem(TOKEN_KEY, nextToken)
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser))
    setToken(nextToken)
    setUser(nextUser)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setToken(null)
    setUser(null)
  }, [])

  const refresh = useCallback(async () => {
    if (!token) {
      setLoading(false)
      return
    }
    try {
      const me = await fetchMe(token)
      setUser(me)
      localStorage.setItem(USER_KEY, JSON.stringify(me))
    } catch {
      logout()
    } finally {
      setLoading(false)
    }
  }, [token, logout])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const value = useMemo(
    () => ({ token, user, loading, setSession, logout, refresh }),
    [token, user, loading, setSession, logout, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth outside provider')
  return ctx
}
