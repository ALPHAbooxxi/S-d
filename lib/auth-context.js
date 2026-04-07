'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const AuthContext = createContext(null)

// Local storage based auth for demo/development
// Replace with Supabase auth when ready
function generateId() {
  return 'user_' + Math.random().toString(36).substring(2, 15)
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for existing session
    const stored = localStorage.getItem('svd_user')
    if (stored) {
      try {
        setUser(JSON.parse(stored))
      } catch (e) {
        localStorage.removeItem('svd_user')
      }
    }
    setLoading(false)
  }, [])

  const register = useCallback(async ({ username, displayName, email, password, contactMethod, contactInfo }) => {
    // Check if username exists
    const allUsers = JSON.parse(localStorage.getItem('svd_all_users') || '[]')
    if (allUsers.find(u => u.username === username)) {
      throw new Error('Dieser Benutzername ist bereits vergeben.')
    }
    if (allUsers.find(u => u.email === email)) {
      throw new Error('Diese E-Mail ist bereits registriert.')
    }

    const newUser = {
      id: generateId(),
      username,
      displayName: displayName || username,
      email,
      contactMethod: contactMethod || 'platform',
      contactInfo: contactInfo || '',
      createdAt: new Date().toISOString(),
    }

    allUsers.push({ ...newUser, password })
    localStorage.setItem('svd_all_users', JSON.stringify(allUsers))
    
    const userPublic = { ...newUser }
    localStorage.setItem('svd_user', JSON.stringify(userPublic))
    setUser(userPublic)
    return userPublic
  }, [])

  const login = useCallback(async ({ email, password }) => {
    const allUsers = JSON.parse(localStorage.getItem('svd_all_users') || '[]')
    const found = allUsers.find(u => u.email === email && u.password === password)
    if (!found) {
      throw new Error('E-Mail oder Passwort falsch.')
    }

    const { password: _, ...userPublic } = found
    localStorage.setItem('svd_user', JSON.stringify(userPublic))
    setUser(userPublic)
    return userPublic
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('svd_user')
    setUser(null)
  }, [])

  const updateProfile = useCallback((updates) => {
    const updated = { ...user, ...updates }
    localStorage.setItem('svd_user', JSON.stringify(updated))
    
    // Also update in all_users
    const allUsers = JSON.parse(localStorage.getItem('svd_all_users') || '[]')
    const idx = allUsers.findIndex(u => u.id === user.id)
    if (idx !== -1) {
      allUsers[idx] = { ...allUsers[idx], ...updates }
      localStorage.setItem('svd_all_users', JSON.stringify(allUsers))
    }
    
    setUser(updated)
  }, [user])

  return (
    <AuthContext.Provider value={{ user, loading, register, login, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
