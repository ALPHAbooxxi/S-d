'use client'

import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
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

export default function NachrichtenPage() {
  const { user } = useAuth()
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const {
    getConversations,
    unreadCount,
  } = useTrades()
  const conversations = getConversations()
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

  useEffect(() => {
    let active = true

    async function hydrateConversationPartners() {
      const missingPartnerIds = conversations
        .map((conversation) => conversation.partnerId)
        .filter((partnerId) => !directoryUserIds.has(partnerId))

      if (missingPartnerIds.length === 0) return

      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, email')
        .in('id', missingPartnerIds)

      if (!active || error || !data) return

      data.forEach((entry) => {
        cacheDiscoveredUser({
          userId: entry.id,
          username: entry.username,
          displayName: entry.display_name || entry.username,
          email: entry.email || null,
        })
      })
    }

    void hydrateConversationPartners()

    return () => {
      active = false
    }
  }, [conversations, directoryUserIds, supabase])

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
    router.push(`/nachrichten/${partnerId}`)
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

      {conversations.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state-icon"><ChatIcon size={40} strokeWidth={1.8} /></span>
          <span className="empty-state-title">Noch keine Nachrichten</span>
          <span className="empty-state-text">
            Starte einen Chat ueber die Suche oder direkt aus einem Match in der Tauschboerse.
          </span>
        </div>
      ) : (
        <div className={styles.layout}>
          <div className={styles.conversationList}>
            {conversations.map((conv) => {
              const partner =
                directory.find((entry) => entry.userId === conv.partnerId) ||
                loadUserProfile(conv.partnerId)

              return (
                <button
                  key={conv.partnerId}
                  className={styles.conversationCard}
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
        </div>
      )}
    </div>
  )
}
