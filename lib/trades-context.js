'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useAuth } from './auth-context'

const TradesContext = createContext(null)
const TRADES_EVENT = 'svd-trades-change'

function createId(prefix) {
  return `${prefix}_${Math.random().toString(36).substring(2, 15)}`
}

function readStoredItems(key) {
  if (typeof window === 'undefined') return []

  try {
    return JSON.parse(localStorage.getItem(key) || '[]')
  } catch (error) {
    return []
  }
}

function subscribeToTrades(callback) {
  if (typeof window === 'undefined') {
    return () => {}
  }

  const handleChange = () => callback()

  window.addEventListener('storage', handleChange)
  window.addEventListener(TRADES_EVENT, handleChange)

  return () => {
    window.removeEventListener('storage', handleChange)
    window.removeEventListener(TRADES_EVENT, handleChange)
  }
}

function emitTradesChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(TRADES_EVENT))
  }
}

function getTradePreview(trade) {
  if (trade.status === 'accepted') return 'Tauschanfrage angenommen'
  if (trade.status === 'declined') return 'Tauschanfrage abgelehnt'
  if (trade.status === 'completed') return 'Tausch abgeschlossen'
  return 'Tauschanfrage offen'
}

export function TradesProvider({ children }) {
  const { user } = useAuth()
  const [trades, setTrades] = useState([])
  const [messages, setMessages] = useState([])

  useEffect(() => {
    const syncFromStorage = () => {
      setTrades(readStoredItems('svd_trades'))
      setMessages(readStoredItems('svd_messages'))
    }

    syncFromStorage()
    const unsubscribe = subscribeToTrades(syncFromStorage)

    return unsubscribe
  }, [user])

  const persistTrades = useCallback((updated) => {
    localStorage.setItem('svd_trades', JSON.stringify(updated))
    emitTradesChange()
  }, [])

  const persistMessages = useCallback((updated) => {
    localStorage.setItem('svd_messages', JSON.stringify(updated))
    emitTradesChange()
  }, [])

  const sendMessage = useCallback((payloadOrReceiverId, maybeContent, maybeTradeId = null) => {
    if (!user) return

    let receiverId = payloadOrReceiverId
    let content = maybeContent
    let tradeId = maybeTradeId

    if (typeof payloadOrReceiverId === 'object' && payloadOrReceiverId !== null) {
      receiverId = payloadOrReceiverId.receiverId
      content = payloadOrReceiverId.content
      tradeId = payloadOrReceiverId.tradeId || null
    }

    const trimmedContent = content?.trim()

    if (!receiverId || !trimmedContent) return null

    const msg = {
      id: createId('msg'),
      tradeId,
      senderId: user.id,
      receiverId,
      content: trimmedContent,
      isRead: false,
      createdAt: new Date().toISOString(),
    }

    const updated = [...messages, msg]
    persistMessages(updated)
    return msg
  }, [user, messages, persistMessages])

  const createTrade = useCallback((receiverId, offeredStickers = [], wantedStickers = [], message = '') => {
    if (!user) return null

    const trade = {
      id: createId('trade'),
      senderId: user.id,
      receiverId,
      offeredStickers,
      wantedStickers,
      status: 'pending',
      message: message?.trim() || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    persistTrades([...trades, trade])
    return trade
  }, [user, trades, persistTrades])

  const updateTradeStatus = useCallback((tradeId, status) => {
    const updated = trades.map(t =>
      t.id === tradeId ? { ...t, status, updatedAt: new Date().toISOString() } : t
    )
    persistTrades(updated)

    if (!user) return

    const trade = updated.find((entry) => entry.id === tradeId)
    if (!trade) return

    const receiverId = user.id === trade.senderId ? trade.receiverId : trade.senderId
    const systemMessage = {
      accepted: 'Tauschanfrage angenommen.',
      declined: 'Tauschanfrage abgelehnt.',
      completed: 'Tausch als erledigt markiert.',
    }
    const content = systemMessage[status]

    if (!content) return

    persistMessages([
      ...messages,
      {
        id: createId('msg'),
        tradeId,
        senderId: user.id,
        receiverId,
        content,
        isRead: false,
        createdAt: new Date().toISOString(),
      },
    ])
  }, [messages, persistMessages, persistTrades, trades, user])

  const markAsRead = useCallback((messageIdsOrPartnerId) => {
    const messageIds = Array.isArray(messageIdsOrPartnerId)
      ? messageIdsOrPartnerId
      : messages
          .filter((message) =>
            message.senderId === messageIdsOrPartnerId &&
            message.receiverId === user?.id &&
            !message.isRead
          )
          .map((message) => message.id)

    if (messageIds.length === 0) return

    const updated = messages.map(m =>
      messageIds.includes(m.id) ? { ...m, isRead: true } : m
    )
    persistMessages(updated)
  }, [messages, persistMessages, user])

  // Get trades relevant to current user
  const myTrades = trades.filter(t => t.senderId === user?.id || t.receiverId === user?.id)
  const incomingTrades = trades.filter(t => t.receiverId === user?.id && t.status === 'pending')
  const outgoingTrades = trades.filter(t => t.senderId === user?.id && t.status === 'pending')
  
  // Get unread messages count
  const unreadCount = messages.filter(m => m.receiverId === user?.id && !m.isRead).length

  // Get messages for a trade
  const getMessagesForTrade = useCallback((tradeId) => {
    return messages.filter(m => m.tradeId === tradeId).sort((a, b) => 
      new Date(a.createdAt) - new Date(b.createdAt)
    )
  }, [messages])

  const getMessagesWithPartner = useCallback((partnerId) => {
    if (!user || !partnerId) return []

    return messages
      .filter((message) => {
        const outgoing = message.senderId === user.id && message.receiverId === partnerId
        const incoming = message.senderId === partnerId && message.receiverId === user.id
        return outgoing || incoming
      })
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
  }, [messages, user])

  const getTradesWithPartner = useCallback((partnerId) => {
    if (!user || !partnerId) return []

    return myTrades
      .filter((trade) => {
        const outgoing = trade.senderId === user.id && trade.receiverId === partnerId
        const incoming = trade.senderId === partnerId && trade.receiverId === user.id
        return outgoing || incoming
      })
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
  }, [myTrades, user])

  // Get unique conversation partners
  const getConversations = useCallback(() => {
    if (!user) return []
    const partnerMap = new Map()

    const upsertPartner = (partnerId, candidate) => {
      const existing = partnerMap.get(partnerId)

      if (!existing) {
        partnerMap.set(partnerId, candidate)
        return
      }

      const isCandidateNewer =
        new Date(candidate.lastActivity).getTime() >= new Date(existing.lastActivity).getTime()

      partnerMap.set(partnerId, {
        ...existing,
        ...(isCandidateNewer ? candidate : {}),
        unread: existing.unread,
        pendingTrades: Math.max(existing.pendingTrades || 0, candidate.pendingTrades || 0),
      })
    }

    const unreadByPartner = new Map()
    messages
      .filter((message) => message.receiverId === user.id && !message.isRead)
      .forEach((message) => {
        unreadByPartner.set(
          message.senderId,
          (unreadByPartner.get(message.senderId) || 0) + 1
        )
      })

    messages
      .filter((message) => message.senderId === user.id || message.receiverId === user.id)
      .forEach((message) => {
        const partnerId = message.senderId === user.id ? message.receiverId : message.senderId
        upsertPartner(partnerId, {
          partnerId,
          lastActivity: message.createdAt,
          preview: message.content,
          tradeId: message.tradeId,
          unread: unreadByPartner.get(partnerId) || 0,
          pendingTrades: 0,
        })
      })

    myTrades.forEach((trade) => {
      const partnerId = trade.senderId === user.id ? trade.receiverId : trade.senderId
      upsertPartner(partnerId, {
        partnerId,
        lastActivity: trade.updatedAt,
        preview: getTradePreview(trade),
        tradeId: trade.id,
        unread: unreadByPartner.get(partnerId) || 0,
        pendingTrades: trade.status === 'pending' ? 1 : 0,
      })
    })

    return Array.from(partnerMap.values())
      .map((conversation) => ({
        ...conversation,
        unread: unreadByPartner.get(conversation.partnerId) || 0,
      }))
      .sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity))
  }, [messages, myTrades, user])

  return (
    <TradesContext.Provider value={{
      trades: myTrades,
      incomingTrades,
      outgoingTrades,
      unreadCount,
      createTrade,
      updateTradeStatus,
      sendMessage,
      markAsRead,
      getMessagesForTrade,
      getMessagesWithPartner,
      getTradesWithPartner,
      getConversations,
    }}>
      {children}
    </TradesContext.Provider>
  )
}

export function useTrades() {
  const ctx = useContext(TradesContext)
  if (!ctx) throw new Error('useTrades must be used within TradesProvider')
  return ctx
}
