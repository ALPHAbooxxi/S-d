'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { ChatIcon } from '@/components/AppIcons'
import { loadUserDirectory, loadUserProfile } from '@/lib/matching'
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
  const directory = user ? loadUserDirectory(user.id) : []

  const selectedPartnerId = partnerFromUrl || conversations[0]?.partnerId || null
  const selectedPartner = !selectedPartnerId
    ? null
    : directory.find((entry) => entry.userId === selectedPartnerId) ||
      loadUserProfile(selectedPartnerId)

  const threadMessages = selectedPartnerId ? getMessagesWithPartner(selectedPartnerId) : []
  const threadTrades = selectedPartnerId ? getTradesWithPartner(selectedPartnerId) : []

  useEffect(() => {
    if (selectedPartnerId) {
      markAsRead(selectedPartnerId)
    }
  }, [markAsRead, selectedPartnerId])

  const handleSelectPartner = (partnerId) => {
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
                  onClick={() => handleSelectPartner(conv.partnerId)}
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
