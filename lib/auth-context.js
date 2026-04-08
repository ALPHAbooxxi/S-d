'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const AuthContext = createContext(null)
function normalizeUsername(username) {
  return username.trim().replace(/^@+/, '')
}

function getAuthRedirectPath(path) {
  if (typeof window === 'undefined') return undefined
  return `${window.location.origin}${path}`
}

function mapUser(authUser, profile) {
  const username =
    profile?.username ||
    authUser?.user_metadata?.username ||
    authUser?.email?.split('@')[0] ||
    ''

  const displayName =
    profile?.display_name ||
    authUser?.user_metadata?.display_name ||
    username

  return {
    id: authUser.id,
    email: authUser.email,
    username,
    displayName,
    createdAt: profile?.created_at || authUser.created_at,
  }
}

function syncLocalUser(user) {
  localStorage.setItem('svd_user', JSON.stringify(user))

  const allUsers = JSON.parse(localStorage.getItem('svd_all_users') || '[]')
  const nextUsers = allUsers.filter((entry) => entry.id !== user.id)
  nextUsers.push(user)
  localStorage.setItem('svd_all_users', JSON.stringify(nextUsers))
}

function clearLocalUser() {
  localStorage.removeItem('svd_user')
}

function removeLocalUserReferences(userId) {
  if (!userId) return

  const allUsers = JSON.parse(localStorage.getItem('svd_all_users') || '[]')
  const nextUsers = allUsers.filter((entry) => entry.id !== userId)
  localStorage.setItem('svd_all_users', JSON.stringify(nextUsers))
  localStorage.removeItem(`svd_stickers_${userId}`)

  const nextTrades = JSON.parse(localStorage.getItem('svd_trades') || '[]').filter(
    (entry) => entry.senderId !== userId && entry.receiverId !== userId
  )
  localStorage.setItem('svd_trades', JSON.stringify(nextTrades))

  const nextMessages = JSON.parse(localStorage.getItem('svd_messages') || '[]').filter(
    (entry) => entry.senderId !== userId && entry.receiverId !== userId
  )
  localStorage.setItem('svd_messages', JSON.stringify(nextMessages))
}

async function getProfile(supabase, userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, display_name, email, created_at')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data
}

async function ensureProfile(supabase, authUser) {
  const existingProfile = await getProfile(supabase, authUser.id)
  const username = normalizeUsername(
    authUser.user_metadata?.username || authUser.email?.split('@')[0] || ''
  )

  const profilePayload = {
    username,
    display_name:
      authUser.user_metadata?.display_name ||
      existingProfile?.display_name ||
      username,
    email: authUser.email,
  }

  if (existingProfile) {
    const needsUpdate =
      existingProfile.username !== profilePayload.username ||
      existingProfile.display_name !== profilePayload.display_name ||
      existingProfile.email !== profilePayload.email

    if (!needsUpdate) {
      return existingProfile
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(profilePayload)
      .eq('id', authUser.id)
      .select('id, username, display_name, email, created_at')
      .maybeSingle()

    if (error) {
      throw error
    }

    return data || { ...existingProfile, ...profilePayload }
  }

  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: authUser.id,
      ...profilePayload,
    })
    .select('id, username, display_name, email, created_at')
    .maybeSingle()

  if (error) {
    throw error
  }

  return data || {
    id: authUser.id,
    ...profilePayload,
  }
}

export function AuthProvider({ children }) {
  const supabase = useMemo(() => createClient(), [])
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const hydrateUser = useCallback(async (authUser) => {
    if (!authUser) {
      clearLocalUser()
      setUser(null)
      return null
    }

    const profile = await ensureProfile(supabase, authUser)
    const mappedUser = mapUser(authUser, profile)
    syncLocalUser(mappedUser)
    setUser(mappedUser)
    return mappedUser
  }, [supabase])

  useEffect(() => {
    let active = true

    async function loadInitialUser() {
      try {
        const { data, error } = await supabase.auth.getUser()
        if (error) throw error
        if (!active) return
        await hydrateUser(data.user)
      } catch (error) {
        clearLocalUser()
        if (active) {
          setUser(null)
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void loadInitialUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      window.setTimeout(() => {
        void hydrateUser(session?.user ?? null)
      }, 0)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [hydrateUser, supabase])

  const register = useCallback(async ({ username, displayName, email, password }) => {
    const normalizedUsername = normalizeUsername(username)

    const { data: existingUser, error: existingUserError } = await supabase
      .from('profiles')
      .select('id')
      .ilike('username', normalizedUsername)
      .maybeSingle()

    if (existingUserError) {
      throw new Error(existingUserError.message)
    }

    if (existingUser) {
      throw new Error('Dieser Benutzername ist bereits vergeben.')
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: getAuthRedirectPath('/auth/confirm?next=/sammlung'),
        data: {
          username: normalizedUsername,
          display_name: displayName || normalizedUsername,
        },
      },
    })

    if (error) {
      throw new Error(error.message)
    }

    if (!data.user) {
      throw new Error('Registrierung fehlgeschlagen.')
    }

    if (!data.session) {
      return {
        pendingEmailConfirmation: true,
        email,
      }
    }

    return await hydrateUser(data.user)
  }, [hydrateUser, supabase])

  const login = useCallback(async ({ email, password }) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      throw new Error(error.message)
    }

    return await hydrateUser(data.user)
  }, [hydrateUser, supabase])

  const requestPasswordReset = useCallback(async (email) => {
    const redirectTo = getAuthRedirectPath('/auth/confirm?next=/passwort-zuruecksetzen')

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    })

    if (error) {
      throw new Error(error.message)
    }
  }, [supabase])

  const updatePassword = useCallback(async ({ password, nonce }) => {
    const payload = nonce ? { password, nonce } : { password }
    const { data, error } = await supabase.auth.updateUser(payload)

    if (error) {
      throw new Error(error.message)
    }

    if (data.user) {
      await hydrateUser(data.user)
    }

    return data.user
  }, [hydrateUser, supabase])

  const updateEmail = useCallback(async ({ email }) => {
    const { data, error } = await supabase.auth.updateUser(
      { email },
      { emailRedirectTo: getAuthRedirectPath('/auth/confirm?next=/profil') }
    )

    if (error) {
      throw new Error(error.message)
    }

    if (data.user) {
      await hydrateUser(data.user)
    }

    return data.user
  }, [hydrateUser, supabase])

  const logout = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      throw new Error(error.message)
    }
    clearLocalUser()
    setUser(null)
  }, [supabase])

  const updateProfile = useCallback(async (updates) => {
    if (!user) return

    const payload = {
      display_name: updates.displayName,
    }

    const { error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', user.id)

    if (error) {
      throw new Error(error.message)
    }

    const { error: authError } = await supabase.auth.updateUser({
      data: {
        display_name: updates.displayName ?? user.displayName,
      },
    })

    if (authError) {
      throw new Error(authError.message)
    }

    const updatedUser = {
      ...user,
      displayName: updates.displayName ?? user.displayName,
    }

    syncLocalUser(updatedUser)
    setUser(updatedUser)
  }, [supabase, user])

  const deleteAccount = useCallback(async () => {
    if (!user) return

    const response = await fetch('/api/account/delete', {
      method: 'POST',
    })

    const payload = await response.json().catch(() => ({}))

    if (!response.ok) {
      throw new Error(payload.error || 'Account konnte nicht gelöscht werden.')
    }

    removeLocalUserReferences(user.id)
    clearLocalUser()
    setUser(null)
  }, [user])

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      register,
      login,
      requestPasswordReset,
      updatePassword,
      updateEmail,
      logout,
      updateProfile,
      deleteAccount,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
