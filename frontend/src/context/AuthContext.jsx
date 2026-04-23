import { createContext, useContext, useState, useCallback } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => {
    try { return JSON.parse(localStorage.getItem('aminos_session')) } catch { return null }
  })

  const login = useCallback((data) => {
    const s = { access_token: data.access_token, refresh_token: data.refresh_token, user: data.user }
    localStorage.setItem('aminos_session', JSON.stringify(s))
    setSession(s)
  }, [])

  const loginAsGuest = useCallback(() => {
    const s = { guest: true, user: { email: 'Guest' } }
    localStorage.setItem('aminos_session', JSON.stringify(s))
    setSession(s)
  }, [])

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch (_) {}
    localStorage.removeItem('aminos_session')
    setSession(null)
  }, [])

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, login, loginAsGuest, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
