'use client'

import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { ChatIcon, CloseIcon, SearchIcon } from '@/components/AppIcons'
import { createClient } from '@/lib/supabase/client'
import { cacheDiscoveredUser, loadUserDirectory, loadUserProfile } from '@/lib/matching'
import { useTrades } from '@/lib/trades-context'
import styles from './nachrichten.module.css'

function formatConversationTime(value) {
  return new Date(value).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
  })
}

function tradeStatusLabel(status) {
  if (status === 'accepted') return 'Angenommen'
  if (status === 'declined') return 'Abgelehnt'
  if (status === 'completed') return 'Erledigt'
  return 'Offen'
}

export default function NachrichtenPage() {
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = useMemo(() => createClient(), [])
  const partnerFromUrl = searchParams.get('partner')
  const {
    getConversations,
    unreadCount,
    getMessagesWithPartner,
    getTradesWithPartner,
    sendMessage,
    markAsRead,
    updateTradeStatus,
  } = useTrades()
  const conversations = getConversations()
  const [draft, setDraft] = useState('')
  const [searchUsername, setSearchUsername] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState('')
  const deferredUsername = useDeferredValue(searchUsername)
  const directory = useMemo(
    () => (user ? loadUserDirectory(user.id) : []),
    [user]
  )
  const directoryUserIds = useMemo(
    () => new Set(directory.map((entry) => entry.userId)),
    [directory]
  )

  const selectedPartnerId = partnerFromUrl || conversations[0]?.partnerId || null
  const discoveredPartner = searchResults.find((entry) => entry.userId === selectedPartnerId) || null
  const selectedPartner = !selectedPartnerId
    ? null
    : directory.find((entry) => entry.userId === selectedPartnerId) ||
      loadUserProfile(selectedPartnerId) ||
      discoveredPartner

  const threadMessages = selectedPartnerId ? getMessagesWithPartner(selectedPartnerId) : []
  const threadTrades = selectedPartnerId ? getTradesWithPartner(selectedPartnerId) : []

  useEffect(() => {
    if (selectedPartnerId) {
      markAsRead(selectedPartnerId)
    }
  }, [markAsRead, selectedPartnerId])

  useEffect(() => {
    let active = true

    async function searchProfiles() {
      const normalized = deferredUsername.trim().replace(/^@+/, '')

      if (!normalized) {
        setSearchResults([])
        setSearchError('')
        setSearchLoading(false)
        return
      }

      setSearchLoading(true)
      setSearchError('')

      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name')
        .ilike('username', `%${normalized}%`)
        .neq('id', user?.id || '')
        .order('username', { ascending: true })
        .limit(8)

      if (!active) return

      if (error) {
        setSearchError('Benutzersuche ist gerade nicht verfuegbar.')
        setSearchResults([])
        setSearchLoading(false)
        return
      }

      const nextResults = (data || []).map((entry) => ({
        userId: entry.id,
        username: entry.username,
        displayName: entry.display_name || entry.username,
        isKnown: directoryUserIds.has(entry.id),
      }))

      setSearchResults(nextResults)
      setSearchLoading(false)
    }

    void searchProfiles()

    return () => {
      active = false
    }
  }, [deferredUsername, directoryUserIds, supabase, user?.id])

  const handleSelectPartner = (partnerId, partnerMeta = null) => {
    if (partnerMeta) {
      cacheDiscoveredUser(partnerMeta)
    }
    router.replace(`/nachrichten?partner=${partnerId}`)
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!selectedPartnerId || !draft.trim()) return

    sendMessage({
      receiverId: selectedPartnerId,
      content: draft,
      tradeId: threadTrades[0]?.id || null,
    })
    setDraft('')
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Nachrichten</h1>
        {unreadCount > 0 && (
          <span className="badge badge-primary">{unreadCount} neu</span>
        )}
      </div>

      <div className={styles.discoveryCard}>
        <div className={styles.discoveryHeader}>
          <div>
            <h2 className={styles.discoveryTitle}>Benutzername finden</h2>
            <p className={styles.discoveryText}>
              Suche direkt nach @Benutzernamen und starte dann den Chat in der App.
            </p>
          </div>
        </div>

        <div className={styles.searchBar}>
          <SearchIcon size={16} strokeWidth={2.5} />
          <input
            type="text"
            className={styles.searchInput}
            value={searchUsername}
            onChange={(event) => setSearchUsername(event.target.value)}
            placeholder="@benutzername suchen..."
            id="chat-username-search"
          />
          {searchUsername && (
            <button
              className={styles.clearSearch}
              onClick={() => setSearchUsername('')}
              aria-label="Suche leeren"
            >
              <CloseIcon size={14} strokeWidth={2.4} />
            </button>
          )}
        </div>

        {searchUsername && (
          <div className={styles.searchResults}>
            {searchLoading ? (
              <div className={styles.searchInfo}>Benutzernamen werden gesucht...</div>
            ) : searchError ? (
              <div className={styles.searchInfo}>{searchError}</div>
            ) : searchResults.length === 0 ? (
              <div className={styles.searchInfo}>
                Kein Benutzername gefunden. Lass dir am besten den Profil-Link oder QR-Code schicken.
              </div>
            ) : (
              searchResults.map((entry) => (
                <button
                  key={entry.userId}
                  className={styles.searchResultCard}
                  onClick={() => handleSelectPartner(entry.userId, entry)}
                >
                  <div className={styles.convAvatar}>
                    {(entry.displayName || entry.username).charAt(0).toUpperCase()}
                  </div>
                  <div className={styles.searchResultContent}>
                    <strong>{entry.displayName || entry.username}</strong>
                    <span>@{entry.username}</span>
                  </div>
                  <span className="badge badge-dark">
                    {entry.isKnown ? 'Chat oeffnen' : 'Neu'}
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {conversations.length === 0 && !selectedPartner ? (
        <div className="empty-state">
          <span className="empty-state-icon"><ChatIcon size={40} strokeWidth={1.8} /></span>
          <span className="empty-state-title">Noch keine Nachrichten</span>
          <span className="empty-state-text">
            Wenn du einen Tausch anfragst oder jemand dich kontaktiert, erscheinen hier deine Unterhaltungen.
          </span>
        </div>
      ) : (
        <div className={styles.layout}>
          <div className={styles.conversationList}>
            {conversations.map((conv) => {
              const partner =
                directory.find((entry) => entry.userId === conv.partnerId) ||
                loadUserProfile(conv.partnerId)
              const isActive = conv.partnerId === selectedPartnerId

              return (
                <button
                  key={conv.partnerId}
                  className={`${styles.conversationCard} ${isActive ? styles.conversationActive : ''}`}
                  onClick={() => handleSelectPartner(conv.partnerId, partner)}
                >
                  <div className={styles.convAvatar}>
                    {(partner?.displayName || partner?.username || conv.partnerId).charAt(0).toUpperCase()}
                  </div>
                  <div className={styles.convContent}>
                    <div className={styles.convTop}>
                      <span className={styles.convName}>{partner?.displayName || partner?.username || conv.partnerId}</span>
                      <span className={styles.convTime}>{formatConversationTime(conv.lastActivity)}</span>
                    </div>
                    <p className={styles.convPreview}>{conv.preview}</p>
                  </div>
                  <div className={styles.convMeta}>
                    {conv.pendingTrades > 0 && (
                      <span className="badge badge-dark">{conv.pendingTrades} offen</span>
                    )}
                    {conv.unread > 0 && (
                      <span className="badge badge-primary">{conv.unread}</span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          {selectedPartner && (
            <div className={styles.threadCard}>
              <div className={styles.threadHeader}>
                <div className={styles.threadAvatar}>
                  {(selectedPartner.displayName || selectedPartner.username).charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className={styles.threadName}>{selectedPartner.displayName || selectedPartner.username}</h2>
                  <p className={styles.threadHandle}>@{selectedPartner.username}</p>
                </div>
              </div>

              {threadTrades.length > 0 && (
                <div className={styles.tradeList}>
                  {threadTrades.map((trade) => {
                    const isIncoming = trade.receiverId === user?.id
                    const canRespond = isIncoming && trade.status === 'pending'
                    const stickersYouGive = isIncoming ? trade.wantedStickers : trade.offeredStickers
                    const stickersYouGet = isIncoming ? trade.offeredStickers : trade.wantedStickers

                    return (
                      <div key={trade.id} className={styles.tradeCard}>
                        <div className={styles.tradeTop}>
                          <strong>Tauschanfrage</strong>
                          <span className={`badge ${trade.status === 'accepted' ? 'badge-success' : trade.status === 'declined' ? 'badge-error' : 'badge-dark'}`}>
                            {tradeStatusLabel(trade.status)}
                          </span>
                        </div>
                        <div className={styles.tradeGrid}>
                          <div>
                            <span className={styles.tradeLabel}>Du gibst</span>
                            <p>{stickersYouGive.length > 0 ? stickersYouGive.map((number) => `#${number}`).join(', ') : 'Noch offen'}</p>
                          </div>
                          <div>
                            <span className={styles.tradeLabel}>Du bekommst</span>
                            <p>{stickersYouGet.length > 0 ? stickersYouGet.map((number) => `#${number}`).join(', ') : 'Noch offen'}</p>
                          </div>
                        </div>

                        {canRespond && (
                          <div className={styles.tradeActions}>
                            <button className="btn btn-secondary btn-sm" onClick={() => updateTradeStatus(trade.id, 'declined')}>
                              Ablehnen
                            </button>
                            <button className="btn btn-primary btn-sm" onClick={() => updateTradeStatus(trade.id, 'accepted')}>
                              Annehmen
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              <div className={styles.messageList}>
                {threadMessages.length === 0 ? (
                  <div className={styles.threadEmpty}>
                    Starte die Unterhaltung hier in der App. Externe Kontakte sind nicht mehr noetig.
                  </div>
                ) : (
                  threadMessages.map((message) => {
                    const ownMessage = message.senderId === user?.id

                    return (
                      <div
                        key={message.id}
                        className={`${styles.messageBubble} ${ownMessage ? styles.messageOwn : styles.messageOther}`}
                      >
                        <p>{message.content}</p>
                        <span>{new Date(message.createdAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    )
                  })
                )}
              </div>

              <form className={styles.composer} onSubmit={handleSubmit}>
                <textarea
                  className={styles.composerInput}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Nachricht schreiben..."
                  rows={3}
                />
                <button className="btn btn-primary" type="submit">
                  Senden
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
