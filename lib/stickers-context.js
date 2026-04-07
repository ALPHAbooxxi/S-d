'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAuth } from './auth-context'

const StickersContext = createContext(null)

// Sticker album configuration – 708 Sticker
export const ALBUM_CONFIG = {
  totalStickers: 708,
  categories: [
    { id: 'wappen', name: 'Wappen & Verein', range: [1, 20] },
    { id: 'vorstand', name: 'Vorstand & Ehrenamt', range: [21, 60] },
    { id: 'herren1', name: '1. Herren', range: [61, 100] },
    { id: 'herren2', name: '2. Herren', range: [101, 140] },
    { id: 'herren3', name: '3. Herren', range: [141, 175] },
    { id: 'herren4', name: '4. Herren', range: [176, 205] },
    { id: 'alte-herren', name: 'Alte Herren', range: [206, 235] },
    { id: 'damen', name: 'Damen', range: [236, 270] },
    { id: 'a-jugend', name: 'A-Jugend', range: [271, 300] },
    { id: 'b-jugend', name: 'B-Jugend', range: [301, 335] },
    { id: 'c-jugend', name: 'C-Jugend', range: [336, 370] },
    { id: 'd-jugend', name: 'D-Jugend', range: [371, 405] },
    { id: 'e-jugend', name: 'E-Jugend', range: [406, 435] },
    { id: 'f-jugend', name: 'F-Jugend', range: [436, 460] },
    { id: 'g-jugend', name: 'G-Jugend', range: [461, 480] },
    { id: 'schiri', name: 'Schiedsrichter', range: [481, 500] },
    { id: 'handball', name: 'Handball', range: [501, 545] },
    { id: 'volleyball', name: 'Volleyball', range: [546, 575] },
    { id: 'tischtennis', name: 'Tischtennis', range: [576, 600] },
    { id: 'darts', name: 'Darts', range: [601, 625] },
    { id: 'turnen', name: 'Turnen & Fitness', range: [626, 655] },
    { id: 'cheerleader', name: 'Cheerleader', range: [656, 675] },
    { id: 'legenden', name: 'Legenden & Historie', range: [676, 708] },
  ],
}

export function getCategoryForSticker(number) {
  return ALBUM_CONFIG.categories.find(
    cat => number >= cat.range[0] && number <= cat.range[1]
  )
}

export function StickersProvider({ children }) {
  const { user } = useAuth()
  const [stickers, setStickers] = useState({}) // { [number]: quantity }
  const [loaded, setLoaded] = useState(false)

  // Load stickers from localStorage
  useEffect(() => {
    if (user) {
      const stored = localStorage.getItem(`svd_stickers_${user.id}`)
      if (stored) {
        try {
          setStickers(JSON.parse(stored))
        } catch (e) {
          setStickers({})
        }
      } else {
        setStickers({})
      }
    } else {
      setStickers({})
    }
    setLoaded(true)
  }, [user])

  // Persist on change
  useEffect(() => {
    if (user && loaded) {
      localStorage.setItem(`svd_stickers_${user.id}`, JSON.stringify(stickers))
    }
  }, [stickers, user, loaded])

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
