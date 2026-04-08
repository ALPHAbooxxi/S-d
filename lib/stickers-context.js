'use client'

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from './auth-context'
import { ALBUM_CONFIG, getCategoryForSticker } from './album-config'
import { createClient } from '@/lib/supabase/client'

const StickersContext = createContext(null)
export { ALBUM_CONFIG, getCategoryForSticker }

export function StickersProvider({ children }) {
  const { user } = useAuth()
  const supabase = useMemo(() => createClient(), [])
  const [stickers, setStickers] = useState({}) // { [number]: quantity }
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let active = true

    async function loadStickers() {
      if (!user) {
        setStickers({})
        setLoaded(true)
        return
      }

      setLoaded(false)

      let localStickers = {}
      const stored = localStorage.getItem(`svd_stickers_${user.id}`)
      if (stored) {
        try {
          localStickers = JSON.parse(stored)
        } catch {
          localStickers = {}
        }
      }

      try {
        const { data, error } = await supabase
          .from('user_stickers')
          .select('sticker_number, quantity')
          .eq('user_id', user.id)

        if (error) {
          throw error
        }

        const remoteStickers = Object.fromEntries(
          (data || []).map((entry) => [entry.sticker_number, entry.quantity])
        )

        const hasRemoteStickers = Object.keys(remoteStickers).length > 0
        const nextStickers = hasRemoteStickers ? remoteStickers : localStickers

        if (!active) return

        setStickers(nextStickers)
        localStorage.setItem(`svd_stickers_${user.id}`, JSON.stringify(nextStickers))
      } catch {
        if (!active) return
        setStickers(localStickers)
      } finally {
        if (active) {
          setLoaded(true)
        }
      }
    }

    void loadStickers()

    return () => {
      active = false
    }
  }, [supabase, user])

  useEffect(() => {
    if (!user || !loaded) return

    localStorage.setItem(`svd_stickers_${user.id}`, JSON.stringify(stickers))

    const entries = Object.entries(stickers).map(([number, quantity]) => ({
      user_id: user.id,
      sticker_number: Number(number),
      quantity,
    }))

    const timeoutId = window.setTimeout(async () => {
      if (entries.length === 0) {
        await supabase
          .from('user_stickers')
          .delete()
          .eq('user_id', user.id)
        return
      }

      await supabase
        .from('user_stickers')
        .upsert(entries, {
          onConflict: 'user_id,sticker_number',
        })

      await supabase
        .from('user_stickers')
        .delete()
        .eq('user_id', user.id)
        .not('sticker_number', 'in', `(${entries.map((entry) => entry.sticker_number).join(',')})`)
    }, 250)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [loaded, stickers, supabase, user])

  const toggleSticker = useCallback((number) => {
    setStickers(prev => {
      const current = prev[number] || 0
      if (current === 0) {
        return { ...prev, [number]: 1 }
      } else {
        const { [number]: _, ...rest } = prev
        return rest
      }
    })
  }, [])

  const incrementSticker = useCallback((number) => {
    setStickers(prev => ({
      ...prev,
      [number]: (prev[number] || 0) + 1
    }))
  }, [])

  const decrementSticker = useCallback((number) => {
    setStickers(prev => {
      const current = prev[number] || 0
      if (current <= 1) {
        const { [number]: _, ...rest } = prev
        return rest
      }
      return { ...prev, [number]: current - 1 }
    })
  }, [])

  const setQuantity = useCallback((number, qty) => {
    setStickers(prev => {
      if (qty <= 0) {
        const { [number]: _, ...rest } = prev
        return rest
      }
      return { ...prev, [number]: qty }
    })
  }, [])

  const bulkAdd = useCallback((numbers) => {
    setStickers(prev => {
      const updated = { ...prev }
      numbers.forEach(n => {
        updated[n] = (updated[n] || 0) + 1
      })
      return updated
    })
  }, [])

  const bulkRemove = useCallback((numbers) => {
    setStickers(prev => {
      const updated = { ...prev }
      numbers.forEach((n) => {
        const current = updated[n] || 0
        if (current <= 1) {
          delete updated[n]
          return
        }
        updated[n] = current - 1
      })
      return updated
    })
  }, [])

  const clearAll = useCallback(() => {
    setStickers({})
  }, [])

  // Computed values
  const ownedStickers = Object.keys(stickers).map(Number).sort((a, b) => a - b)
  const duplicateStickers = Object.entries(stickers)
    .filter(([_, qty]) => qty > 1)
    .map(([num, qty]) => ({ number: Number(num), quantity: qty - 1 }))
    .sort((a, b) => a.number - b.number)
  const missingStickers = Array.from(
    { length: ALBUM_CONFIG.totalStickers },
    (_, i) => i + 1
  ).filter(n => !stickers[n])
  
  const progress = (ownedStickers.length / ALBUM_CONFIG.totalStickers) * 100
  const totalDuplicates = duplicateStickers.reduce((sum, s) => sum + s.quantity, 0)

  return (
    <StickersContext.Provider value={{
      stickers,
      ownedStickers,
      duplicateStickers,
      missingStickers,
      progress,
      totalDuplicates,
      toggleSticker,
      incrementSticker,
      decrementSticker,
      setQuantity,
      bulkAdd,
      bulkRemove,
      clearAll,
      loaded,
    }}>
      {children}
    </StickersContext.Provider>
  )
}

export function useStickers() {
  const ctx = useContext(StickersContext)
  if (!ctx) throw new Error('useStickers must be used within StickersProvider')
  return ctx
}
