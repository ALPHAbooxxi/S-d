'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAuth } from './auth-context'

const TradesContext = createContext(null)

export function TradesProvider({ children }) {
  const { user } = useAuth()
  const [trades, setTrades] = useState([])
  const [messages, setMessages] = useState([])

  useEffect(() => {
    const storedTrades = JSON.parse(localStorage.getItem('svd_trades') || '[]')
    setTrades(storedTrades)
    const storedMessages = JSON.parse(localStorage.getItem('svd_messages') || '[]')
    setMessages(storedMessages)
  }, [user])

  const persistTrades = useCallback((updated) => {
    localStorage.setItem('svd_trades', JSON.stringify(updated))
    setTrades(updated)
  }, [])

  const persistMessages = useCallback((updated) => {
    localStorage.setItem('svd_messages', JSON.stringify(updated))
    setMessages(updated)
  }, [])

  const createTrade = useCallback((receiverId, offeredStickers, wantedStickers, message) => {
    if (!user) return
    const trade = {
      id: 'trade_' + Math.random().toString(36).substring(2, 15),
      senderId: user.id,
      receiverId,
      offeredStickers, // numbers I offer
      wantedStickers,  // numbers I want
      status: 'pending', // pending | accepted | declined | completed
      message,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    const updated = [...trades, trade]
    persistTrades(updated)

    if (message) {
      sendMessage(trade.id, receiverId, message)
    }

    return trade
  }, [user, trades, persistTrades])

  const updateTradeStatus = useCallback((tradeId, status) => {
    const updated = trades.map(t =>
      t.id === tradeId ? { ...t, status, updatedAt: new Date().toISOString() } : t
    )
    persistTrades(updated)
  }, [trades, persistTrades])

  const sendMessage = useCallback((tradeId, receiverId, content) => {
    if (!user) return
    const msg = {
      id: 'msg_' + Math.random().toString(36).substring(2, 15),
      tradeId,
      senderId: user.id,
      receiverId,
      content,
      isRead: false,
      createdAt: new Date().toISOString(),
    }
    const updated = [...messages, msg]
    persistMessages(updated)
    return msg
  }, [user, messages, persistMessages])

  const markAsRead = useCallback((messageIds) => {
    const updated = messages.map(m =>
      messageIds.includes(m.id) ? { ...m, isRead: true } : m
    )
    persistMessages(updated)
  }, [messages, persistMessages])

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

  // Get unique conversation partners
  const getConversations = useCallback(() => {
    if (!user) return []
    const partnerMap = new Map()
    
    messages
      .filter(m => m.senderId === user.id || m.receiverId === user.id)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .forEach(m => {
        const partnerId = m.senderId === user.id ? m.receiverId : m.senderId
        if (!partnerMap.has(partnerId)) {
          partnerMap.set(partnerId, {
            partnerId,
            lastMessage: m,
            unread: messages.filter(msg => msg.senderId === partnerId && msg.receiverId === user.id && !msg.isRead).length,
            tradeId: m.tradeId,
          })
        }
      })
    
    return Array.from(partnerMap.values())
  }, [user, messages])

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
