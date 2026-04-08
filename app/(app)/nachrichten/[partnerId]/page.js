'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { ChatIcon } from '@/components/AppIcons'
import { useAuth } from '@/lib/auth-context'
import { createClient } from '@/lib/supabase/client'
import { cacheDiscoveredUser, loadUserDirectory, loadUserProfile } from '@/lib/matching'
import { useTrades } from '@/lib/trades-context'
import styles from '../nachrichten.module.css'

function tradeStatusLabel(status) {
  if (status === 'accepted') return 'Angenommen'
  if (status === 'declined') return 'Abgelehnt'
  if (status === 'completed') return 'Erledigt'
  return 'Offen'
}

function parseStickerList(value) {
  if (!value) return []

  return value
    .split(',')
    .map((entry) => Number(entry))
    .filter((entry) => Number.isInteger(entry) && entry > 0)
}

function formatStickerList(values) {
  if (!values.length) return 'Noch offen'
  return values.map((number) => `#${number}`).join(', ')
}

function ChatDetailContent() {
  const { user } = useAuth()
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const supabase = useMemo(() => createClient(), [])
  const partnerId = params.partnerId
  const {
    getMessagesWithPartner,
    getTradesWithPartner,
    sendMessage,
    createTrade,
    markAsRead,
    updateTradeStatus,
  } = useTrades()
  const [draft, setDraft] = useState('')
  const [tradeNote, setTradeNote] = useState('')
  const [partner, setPartner] = useState(() => {
    if (!user || !partnerId) return null
    return (
      loadUserDirectory(user.id).find((entry) => entry.userId === partnerId) ||
      loadUserProfile(partnerId)
    )
  })
  const threadMessages = getMessagesWithPartner(partnerId)
  const threadTrades = getTradesWithPartner(partnerId)
  const tradeDraft = useMemo(() => {
    const suggestedGive = parseStickerList(searchParams.get('give'))
    const suggestedWant = parseStickerList(searchParams.get('want'))
    const intent = searchParams.get('intent')

    if (intent !== 'trade' || (suggestedGive.length === 0 && suggestedWant.length === 0)) {
      return null
    }

    return {
      give: suggestedGive,
      want: suggestedWant,
    }
  }, [searchParams])

  useEffect(() => {
    if (partnerId) {
      markAsRead(partnerId)
    }
  }, [markAsRead, partnerId])

  useEffect(() => {
    let active = true

    async function hydratePartner() {
      if (!partnerId || partner) return

      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, email')
        .eq('id', partnerId)
        .maybeSingle()

      if (!active || error || !data) return

      const discoveredPartner = {
        userId: data.id,
        username: data.username,
        displayName: data.display_name || data.username,
        email: data.email || null,
      }

      cacheDiscoveredUser(discoveredPartner)
      setPartner(discoveredPartner)
    }

    void hydratePartner()

    return () => {
      active = false
    }
  }, [partner, partnerId, supabase])

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!draft.trim()) return

    sendMessage({
      receiverId: partnerId,
      content: draft,
      tradeId: threadTrades[0]?.id || null,
    })
    setDraft('')
  }

  const handleSendTradeDraft = () => {
    if (!tradeDraft) return

    createTrade(
      partnerId,
      tradeDraft.give,
      tradeDraft.want,
      tradeNote
    )

    setTradeNote('')
    router.replace(`/nachrichten/${partnerId}`)
  }

  const handleDismissTradeDraft = () => {
    setTradeNote('')
    router.replace(`/nachrichten/${partnerId}`)
  }

  const handleBack = () => {
    router.push('/nachrichten')
  }

  return (
    <div className={styles.detailPage}>
      <div className={styles.detailTopBar}>
        <button className={styles.detailBack} onClick={handleBack} aria-label="Zurueck zu Nachrichten">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
        </button>
        {partner && (
          <div className={styles.detailIdentity}>
            <div className={styles.threadAvatar}>
              {(partner.displayName || partner.username).charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className={styles.threadName}>{partner.displayName || partner.username}</h1>
              <p className={styles.threadHandle}>@{partner.username}</p>
            </div>
          </div>
        )}
      </div>

      {!partner ? (
        <div className="empty-state">
          <span className="empty-state-icon"><ChatIcon size={40} strokeWidth={1.8} /></span>
          <span className="empty-state-title">Chat wird geladen</span>
          <span className="empty-state-text">
            Das Profil dieses Nutzers wird gerade vorbereitet.
          </span>
        </div>
      ) : (
        <>
          {tradeDraft && (
            <div className={styles.draftCard}>
              <div className={styles.tradeTop}>
                <strong>Tauschanfrage vorbereiten</strong>
                <span className="badge badge-dark">Vorschlag</span>
              </div>
              <div className={styles.tradeGrid}>
                <div>
                  <span className={styles.tradeLabel}>Du gibst</span>
                  <p>{formatStickerList(tradeDraft.give)}</p>
                </div>
                <div>
                  <span className={styles.tradeLabel}>Du bekommst</span>
                  <p>{formatStickerList(tradeDraft.want)}</p>
                </div>
              </div>
              <div className="input-group">
                <label htmlFor="trade-note">Kurze Nachricht</label>
                <textarea
                  id="trade-note"
                  className={styles.composerInput}
                  value={tradeNote}
                  onChange={(event) => setTradeNote(event.target.value)}
                  placeholder="Optional: kurzer Hinweis zum Tausch"
                  rows={3}
                />
              </div>
              <div className={styles.tradeActions}>
                <button className="btn btn-secondary btn-sm" onClick={handleDismissTradeDraft}>
                  Verwerfen
                </button>
                <button className="btn btn-primary btn-sm" onClick={handleSendTradeDraft}>
                  Anfrage senden
                </button>
              </div>
            </div>
          )}

          {threadTrades.length > 0 && (
            <div className={styles.tradeList}>
              {threadTrades.map((trade) => {
                const isIncoming = trade.receiverId === user?.id
                const canRespond = isIncoming && trade.status === 'pending'
                const canComplete = trade.status === 'accepted'
                const stickersYouGive = isIncoming ? trade.wantedStickers : trade.offeredStickers
                const stickersYouGet = isIncoming ? trade.offeredStickers : trade.wantedStickers

                return (
                  <div key={trade.id} className={styles.tradeCard}>
                    <div className={styles.tradeTop}>
                      <strong>Tauschanfrage</strong>
                      <span className={`badge ${trade.status === 'accepted' ? 'badge-success' : trade.status === 'declined' ? 'badge-error' : trade.status === 'completed' ? 'badge-success' : 'badge-dark'}`}>
                        {tradeStatusLabel(trade.status)}
                      </span>
                    </div>
                    <div className={styles.tradeGrid}>
                      <div>
                        <span className={styles.tradeLabel}>Du gibst</span>
                        <p>{formatStickerList(stickersYouGive)}</p>
                      </div>
                      <div>
                        <span className={styles.tradeLabel}>Du bekommst</span>
                        <p>{formatStickerList(stickersYouGet)}</p>
                      </div>
                    </div>

                    {trade.message ? (
                      <p className={styles.tradeNote}>{trade.message}</p>
                    ) : null}

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

                    {!canRespond && canComplete && (
                      <div className={styles.tradeActions}>
                        <button className="btn btn-dark btn-sm" onClick={() => updateTradeStatus(trade.id, 'completed')}>
                          Als erledigt markieren
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          <div className={styles.threadCard}>
            <div className={styles.messageList}>
              {threadMessages.length === 0 ? (
                <div className={styles.threadEmpty}>
                  Starte den Chat direkt hier oder sende eine strukturierte Tauschanfrage.
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
        </>
      )}
    </div>
  )
}

export default function ChatDetailPage() {
  return (
    <Suspense fallback={null}>
      <ChatDetailContent />
    </Suspense>
  )
}
