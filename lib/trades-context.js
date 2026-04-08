'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from './auth-context'

const TradesContext = createContext(null)

function mapDbTradeStatus(status) {
  if (status === 'akzeptiert') return 'accepted'
  if (status === 'abgelehnt') return 'declined'
  if (status === 'erledigt') return 'completed'
  return 'pending'
}

function mapAppTradeStatus(status) {
  if (status === 'accepted') return 'akzeptiert'
  if (status === 'declined') return 'abgelehnt'
  if (status === 'completed') return 'erledigt'
  return 'offen'
}

function mapTrade(row) {
  return {
    id: row.id,
    senderId: row.sender_id,
    receiverId: row.receiver_id,
    offeredStickers: row.offered_stickers || [],
    wantedStickers: row.requested_stickers || [],
    status: mapDbTradeStatus(row.status),
    message: row.message || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapMessage(row) {
  return {
    id: row.id,
    tradeId: row.trade_request_id,
    senderId: row.sender_id,
    receiverId: row.receiver_id,
    content: row.content,
    isRead: row.is_read,
    createdAt: row.created_at,
  }
}

function conversationFilter(userId, partnerId) {
  return `and(sender_id.eq.${userId},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${userId})`
}

function getTradePreview(trade) {
  if (trade.status === 'accepted') return 'Tauschanfrage angenommen'
  if (trade.status === 'declined') return 'Tauschanfrage abgelehnt'
  if (trade.status === 'completed') return 'Tausch abgeschlossen'
  return 'Tauschanfrage offen'
}

function upsertById(list, entry, sortFn) {
  const next = list.some((item) => item.id === entry.id)
    ? list.map((item) => (item.id === entry.id ? { ...item, ...entry } : item))
    : [...list, entry]

  return sortFn ? [...next].sort(sortFn) : next
}

function removeById(list, entryId) {
  return list.filter((item) => item.id !== entryId)
}

async function notifyPush({ receiverId, title, body, url }) {
  try {
    await fetch('/api/push/notify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        receiverId,
        title,
        body,
        url,
      }),
    })
  } catch {
    // Push should never block chat delivery.
  }
}

export function TradesProvider({ children }) {
  const { user } = useAuth()
  const supabase = useMemo(() => createClient(), [])
  const [trades, setTrades] = useState([])
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [syncError, setSyncError] = useState('')
  const refreshInFlight = useRef(null)

  const syncTrades = useCallback((updater) => {
    setTrades((current) => {
      const next = updater(current)
      return [...next].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    })
  }, [])

  const syncMessages = useCallback((updater) => {
    setMessages((current) => {
      const next = updater(current)
      return [...next].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    })
  }, [])

  const refresh = useCallback(async ({ silent = false } = {}) => {
    if (!user) {
      setTrades([])
      setMessages([])
      setLoading(false)
      setSyncError('')
      return
    }

    if (refreshInFlight.current) {
      return refreshInFlight.current
    }

    if (!silent) {
      setLoading(true)
    }

    const task = Promise.all([
      supabase
        .from('trade_requests')
        .select('id, sender_id, receiver_id, offered_stickers, requested_stickers, message, status, created_at, updated_at')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('updated_at', { ascending: false }),
      supabase
        .from('messages')
        .select('id, sender_id, receiver_id, trade_request_id, content, is_read, created_at')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: true }),
    ])
      .then(([tradeResult, messageResult]) => {
        if (tradeResult.error) {
          throw tradeResult.error
        }

        if (messageResult.error) {
          throw messageResult.error
        }

        setTrades((tradeResult.data || []).map(mapTrade))
        setMessages((messageResult.data || []).map(mapMessage))
        setSyncError('')
      })
      .catch((error) => {
        setSyncError(error.message || 'Nachrichten konnten nicht synchronisiert werden.')
        throw error
      })
      .finally(() => {
        refreshInFlight.current = null
        setLoading(false)
      })

    refreshInFlight.current = task
    return task
  }, [supabase, user])

  const handleMessagePayload = useCallback((payload) => {
    const row = payload.new || payload.old
    if (!row) return

    if (payload.eventType === 'DELETE') {
      syncMessages((current) => removeById(current, row.id))
      return
    }

    const nextMessage = mapMessage(row)
    syncMessages((current) => upsertById(current, nextMessage))
  }, [syncMessages])

  const handleTradePayload = useCallback((payload) => {
    const row = payload.new || payload.old
    if (!row) return

    if (payload.eventType === 'DELETE') {
      syncTrades((current) => removeById(current, row.id))
      return
    }

    const nextTrade = mapTrade(row)
    syncTrades((current) => upsertById(current, nextTrade))
  }, [syncTrades])

  useEffect(() => {
    let active = true

    async function bootstrap() {
      try {
        await refresh()
      } catch {
        if (active && !user) {
          setLoading(false)
        }
      }
    }

    void bootstrap()

    if (!user) {
      return () => {
        active = false
      }
    }

    const refreshOnReturn = () => {
      if (document.visibilityState === 'visible') {
        void refresh({ silent: true })
      }
    }

    const refreshOnFocus = () => {
      void refresh({ silent: true })
    }

    window.addEventListener('focus', refreshOnFocus)
    window.addEventListener('online', refreshOnFocus)
    document.addEventListener('visibilitychange', refreshOnReturn)

    const channel = supabase
      .channel(`trades-sync-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `sender_id=eq.${user.id}`,
        },
        handleMessagePayload
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        handleMessagePayload
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trade_requests',
          filter: `sender_id=eq.${user.id}`,
        },
        handleTradePayload
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trade_requests',
          filter: `receiver_id=eq.${user.id}`,
        },
        handleTradePayload
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          void refresh({ silent: true })
        }
      })

    return () => {
      active = false
      window.removeEventListener('focus', refreshOnFocus)
      window.removeEventListener('online', refreshOnFocus)
      document.removeEventListener('visibilitychange', refreshOnReturn)
      void supabase.removeChannel(channel)
    }
  }, [handleMessagePayload, handleTradePayload, refresh, supabase, user])

  const sendMessage = useCallback(async (payloadOrReceiverId, maybeContent, maybeTradeId = null) => {
    if (!user) return null

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

    const { data, error } = await supabase
      .from('messages')
      .insert({
        sender_id: user.id,
        receiver_id: receiverId,
        trade_request_id: tradeId,
        content: trimmedContent,
      })
      .select('id, sender_id, receiver_id, trade_request_id, content, is_read, created_at')
      .maybeSingle()

    if (error) {
      throw new Error(error.message)
    }

    if (data) {
      const nextMessage = mapMessage(data)
      syncMessages((current) => upsertById(current, nextMessage))

      await notifyPush({
        receiverId,
        title: `${user.displayName || user.username} hat dir geschrieben`,
        body: trimmedContent.length > 120 ? `${trimmedContent.slice(0, 117)}...` : trimmedContent,
        url: `/nachrichten/${user.id}`,
      })

      return nextMessage
    }

    await refresh({ silent: true })
    return null
  }, [refresh, supabase, syncMessages, user])

  const createTrade = useCallback(async (receiverId, offeredStickers = [], wantedStickers = [], message = '') => {
    if (!user) return null

    const { data, error } = await supabase
      .from('trade_requests')
      .insert({
        sender_id: user.id,
        receiver_id: receiverId,
        request_type: 'tausch',
        offered_stickers: offeredStickers,
        requested_stickers: wantedStickers,
        message: message?.trim() || null,
        status: 'offen',
      })
      .select('id, sender_id, receiver_id, offered_stickers, requested_stickers, message, status, created_at, updated_at')
      .maybeSingle()

    if (error) {
      throw new Error(error.message)
    }

    if (data) {
      const nextTrade = mapTrade(data)
      syncTrades((current) => upsertById(current, nextTrade))

      await notifyPush({
        receiverId,
        title: `${user.displayName || user.username} hat eine Tauschanfrage geschickt`,
        body: message?.trim() || 'Oeffne den Chat, um den Tauschvorschlag anzusehen.',
        url: `/nachrichten/${user.id}`,
      })

      return nextTrade
    }

    await refresh({ silent: true })
    return null
  }, [refresh, supabase, syncTrades, user])

  const updateTradeStatus = useCallback(async (tradeId, status) => {
    if (!user) return

    const { data, error } = await supabase
      .from('trade_requests')
      .update({
        status: mapAppTradeStatus(status),
      })
      .eq('id', tradeId)
      .select('id, sender_id, receiver_id, offered_stickers, requested_stickers, message, status, created_at, updated_at')
      .maybeSingle()

    if (error) {
      throw new Error(error.message)
    }

    const updatedTrade = data ? mapTrade(data) : null
    if (updatedTrade) {
      syncTrades((current) => upsertById(current, updatedTrade))
    }

    const trade = updatedTrade || trades.find((entry) => entry.id === tradeId)
    if (!trade) return

    const receiverId = user.id === trade.senderId ? trade.receiverId : trade.senderId
    const systemMessage = {
      accepted: 'Tauschanfrage angenommen.',
      declined: 'Tauschanfrage abgelehnt.',
      completed: 'Tausch als erledigt markiert.',
    }
    const content = systemMessage[status]

    if (content) {
      await sendMessage({
        receiverId,
        content,
        tradeId,
      })
    }
  }, [sendMessage, supabase, syncTrades, trades, user])

  const markAsRead = useCallback(async (messageIdsOrPartnerId) => {
    if (!user) return

    const messageIds = Array.isArray(messageIdsOrPartnerId)
      ? messageIdsOrPartnerId
      : messages
          .filter((message) =>
            message.senderId === messageIdsOrPartnerId &&
            message.receiverId === user.id &&
            !message.isRead
          )
          .map((message) => message.id)

    if (messageIds.length === 0) return

    const { error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .in('id', messageIds)

    if (error) {
      throw new Error(error.message)
    }

    syncMessages((current) => current.map((message) => (
      messageIds.includes(message.id) ? { ...message, isRead: true } : message
    )))
  }, [messages, supabase, syncMessages, user])

  const deleteConversation = useCallback(async (partnerId) => {
    if (!user || !partnerId) return

    const filter = conversationFilter(user.id, partnerId)

    const [messageResult, tradeResult] = await Promise.all([
      supabase
        .from('messages')
        .delete()
        .or(filter),
      supabase
        .from('trade_requests')
        .delete()
        .or(filter),
    ])

    if (messageResult.error) {
      throw new Error(messageResult.error.message)
    }

    if (tradeResult.error) {
      throw new Error(tradeResult.error.message)
    }

    syncMessages((current) => current.filter((message) => {
      const outgoing = message.senderId === user.id && message.receiverId === partnerId
      const incoming = message.senderId === partnerId && message.receiverId === user.id
      return !outgoing && !incoming
    }))

    syncTrades((current) => current.filter((trade) => {
      const outgoing = trade.senderId === user.id && trade.receiverId === partnerId
      const incoming = trade.senderId === partnerId && trade.receiverId === user.id
      return !outgoing && !incoming
    }))
  }, [supabase, syncMessages, syncTrades, user])

  const myTrades = trades.filter((trade) => trade.senderId === user?.id || trade.receiverId === user?.id)
  const incomingTrades = trades.filter((trade) => trade.receiverId === user?.id && trade.status === 'pending')
  const outgoingTrades = trades.filter((trade) => trade.senderId === user?.id && trade.status === 'pending')
  const unreadCount = messages.filter((message) => message.receiverId === user?.id && !message.isRead).length

  const getMessagesForTrade = useCallback((tradeId) => {
    return messages
      .filter((message) => message.tradeId === tradeId)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
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

  const getConversations = useCallback(() => {
    if (!user) return []

    const partnerMap = new Map()
    const unreadByPartner = new Map()

    messages
      .filter((message) => message.receiverId === user.id && !message.isRead)
      .forEach((message) => {
        unreadByPartner.set(
          message.senderId,
          (unreadByPartner.get(message.senderId) || 0) + 1
        )
      })

    function upsertPartner(partnerId, candidate) {
      const existing = partnerMap.get(partnerId)

      if (!existing) {
        partnerMap.set(partnerId, candidate)
        return
      }

      const candidateTime = new Date(candidate.lastActivity).getTime()
      const existingTime = new Date(existing.lastActivity).getTime()

      partnerMap.set(partnerId, {
        ...existing,
        ...(candidateTime >= existingTime ? candidate : {}),
        unread: unreadByPartner.get(partnerId) || 0,
        pendingTrades: Math.max(existing.pendingTrades || 0, candidate.pendingTrades || 0),
      })
    }

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
    <TradesContext.Provider
      value={{
        trades: myTrades,
        incomingTrades,
        outgoingTrades,
        unreadCount,
        loading,
        syncError,
        refreshTrades: refresh,
        createTrade,
        updateTradeStatus,
        sendMessage,
        markAsRead,
        deleteConversation,
        getMessagesForTrade,
        getMessagesWithPartner,
        getTradesWithPartner,
        getConversations,
      }}
    >
      {children}
    </TradesContext.Provider>
  )
}

export function useTrades() {
  const ctx = useContext(TradesContext)
  if (!ctx) throw new Error('useTrades must be used within TradesProvider')
  return ctx
}
