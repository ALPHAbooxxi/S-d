'use client'

import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react'
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
  const [undoAction, setUndoAction] = useState(null)
  const undoTimerRef = useRef(null)

  const clearUndoAction = useCallback(() => {
    if (undoTimerRef.current) {
      window.clearTimeout(undoTimerRef.current)
      undoTimerRef.current = null
    }
    setUndoAction(null)
  }, [])

  useEffect(() => {
    return () => {
      if (undoTimerRef.current) {
        window.clearTimeout(undoTimerRef.current)
      }
    }
  }, [])

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
        clearUndoAction()
        localStorage.setItem(`svd_stickers_${user.id}`, JSON.stringify(nextStickers))
      } catch {
        if (!active) return
        setStickers(localStickers)
        clearUndoAction()
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
  }, [clearUndoAction, supabase, user])

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

  const registerUndo = useCallback((previousStickers, label, options = {}) => {
    if (undoTimerRef.current) {
      window.clearTimeout(undoTimerRef.current)
    }

    const id = `${Date.now()}-${Math.random()}`
    setUndoAction({
      id,
      label,
      previousStickers,
      onUndo: options.onUndo,
    })

    undoTimerRef.current = window.setTimeout(() => {
      setUndoAction((current) => (current?.id === id ? null : current))
      undoTimerRef.current = null
    }, 10000)
  }, [])

  const applyStickerChange = useCallback((updater, label, options) => {
    setStickers((prev) => {
      const next = updater(prev)
      if (next === prev) return prev

      registerUndo(prev, label, options)
      return next
    })
  }, [registerUndo])

  const undoLastStickerChange = useCallback(() => {
    if (!undoAction) return

    if (undoTimerRef.current) {
      window.clearTimeout(undoTimerRef.current)
      undoTimerRef.current = null
    }

    setStickers(undoAction.previousStickers)
    if (typeof undoAction.onUndo === 'function') {
      undoAction.onUndo()
    }
    setUndoAction(null)
  }, [undoAction])

  const toggleSticker = useCallback((number, label) => {
    const stickerNumber = Number(number)
    const defaultLabel = (stickers[stickerNumber] || 0) > 0
      ? `Sticker #${stickerNumber} entfernt`
      : `Sticker #${stickerNumber} hinzugefügt`

    applyStickerChange(prev => {
      const current = prev[number] || 0
      if (current === 0) {
        return { ...prev, [number]: 1 }
      } else {
        const { [number]: _, ...rest } = prev
        return rest
      }
    }, label || defaultLabel)
  }, [applyStickerChange, stickers])

  const incrementSticker = useCallback((number, label) => {
    applyStickerChange(prev => ({
      ...prev,
      [number]: (prev[number] || 0) + 1
    }), label || `Sticker #${number} hinzugefügt`)
  }, [applyStickerChange])

  const decrementSticker = useCallback((number, label) => {
    applyStickerChange(prev => {
      const current = prev[number] || 0
      if (current <= 0) return prev
      if (current <= 1) {
        const { [number]: _, ...rest } = prev
        return rest
      }
      return { ...prev, [number]: current - 1 }
    }, label || `Sticker #${number} entfernt`)
  }, [applyStickerChange])

  const setQuantity = useCallback((number, qty, label) => {
    applyStickerChange(prev => {
      if ((prev[number] || 0) === qty) return prev

      if (qty <= 0) {
        const { [number]: _, ...rest } = prev
        return rest
      }
      return { ...prev, [number]: qty }
    }, label || `Sticker #${number} geändert`)
  }, [applyStickerChange])

  const bulkAdd = useCallback((numbers, label, options) => {
    if (!numbers.length) return

    applyStickerChange(prev => {
      const updated = { ...prev }
      numbers.forEach(n => {
        updated[n] = (updated[n] || 0) + 1
      })
      return updated
    }, label || `${numbers.length} Sticker hinzugefügt`, options)
  }, [applyStickerChange])

  const bulkRemove = useCallback((numbers, label, options) => {
    if (!numbers.length) return

    applyStickerChange(prev => {
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
    }, label || `${numbers.length} Sticker entfernt`, options)
  }, [applyStickerChange])

  const applyStickerTransfer = useCallback((addNumbers = [], removeNumbers = [], label = 'Sammlung aktualisiert', options) => {
    if (!addNumbers.length && !removeNumbers.length) return

    applyStickerChange(prev => {
      const updated = { ...prev }

      addNumbers.forEach((n) => {
        updated[n] = (updated[n] || 0) + 1
      })

      removeNumbers.forEach((n) => {
        const current = updated[n] || 0
        if (current <= 1) {
          delete updated[n]
          return
        }
        updated[n] = current - 1
      })

      return updated
    }, label, options)
  }, [applyStickerChange])

  const clearAll = useCallback(() => {
    applyStickerChange(() => ({}), 'Sammlung geleert')
  }, [applyStickerChange])

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
      applyStickerTransfer,
      clearAll,
      undoAction,
      undoLastStickerChange,
      clearUndoAction,
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
