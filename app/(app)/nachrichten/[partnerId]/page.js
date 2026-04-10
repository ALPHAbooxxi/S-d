'use client'

import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { ChatIcon } from '@/components/AppIcons'
import { useAuth } from '@/lib/auth-context'
import { createClient } from '@/lib/supabase/client'
import { cacheDiscoveredUser, loadUserDirectory, loadUserProfile } from '@/lib/matching'
import { useTrades } from '@/lib/trades-context'
import { useStickers } from '@/lib/stickers-context'
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
    deleteConversation,
    loading,
    syncError,
    refreshTrades,
    createCounterOffer,
  } = useTrades()
  const { bulkAdd, bulkRemove, setQuantity, incrementSticker, decrementSticker, stickers } = useStickers()
  const [draft, setDraft] = useState('')
  const [tradeNote, setTradeNote] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletingConversation, setDeletingConversation] = useState(false)
  const [sendingMessage, setSendingMessage] = useState(false)
  const [sendingTrade, setSendingTrade] = useState(false)
  const [messageError, setMessageError] = useState('')
  const [tradeError, setTradeError] = useState('')
  const [toastMessage, setToastMessage] = useState(null)
  
  // Counter Offer State
  const [counterOfferTradeId, setCounterOfferTradeId] = useState(null)
  const [counterGive, setCounterGive] = useState([])
  const [counterWant, setCounterWant] = useState([])
  const [counterNote, setCounterNote] = useState('')
  const [sendingCounter, setSendingCounter] = useState(false)
  const [counterError, setCounterError] = useState('')
  const [lastFailedDraft, setLastFailedDraft] = useState(null)
  const [partner, setPartner] = useState(() => {
    if (!user || !partnerId) return null
    return (
      loadUserDirectory(user.id).find((entry) => entry.userId === partnerId) ||
      loadUserProfile(partnerId)
    )
  })
  const threadMessages = getMessagesWithPartner(partnerId)
  const threadTrades = getTradesWithPartner(partnerId)
  const messageListRef = useRef(null)
  const messageEndRef = useRef(null)
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

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  useEffect(() => {
    if (partnerId) {
      void markAsRead(partnerId)
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

  useEffect(() => {
    if (!messageEndRef.current) return
    messageEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [partnerId, threadMessages.length, threadTrades.length])

  const handleSubmit = async (event) => {
    event.preventDefault()
    const nextDraft = draft.trim()
    if (!nextDraft || sendingMessage) return

    setSendingMessage(true)
    setMessageError('')

    try {
      await sendMessage({
        receiverId: partnerId,
        content: nextDraft,
        tradeId: threadTrades[0]?.id || null,
      })
      setLastFailedDraft(null)
      setDraft('')
    } catch (error) {
      setLastFailedDraft({
        receiverId: partnerId,
        content: nextDraft,
        tradeId: threadTrades[0]?.id || null,
      })
      setMessageError(error.message || 'Nachricht konnte nicht gesendet werden.')
    } finally {
      setSendingMessage(false)
    }
  }

  const handleRetryMessage = async () => {
    if (!lastFailedDraft || sendingMessage) return

    setSendingMessage(true)
    setMessageError('')

    try {
      await sendMessage(lastFailedDraft)
      setLastFailedDraft(null)
      setDraft('')
    } catch (error) {
      setMessageError(error.message || 'Nachricht konnte nicht erneut gesendet werden.')
    } finally {
      setSendingMessage(false)
    }
  }

  const handleSendTradeDraft = async () => {
    if (!tradeDraft || sendingTrade) return

    setSendingTrade(true)
    setTradeError('')

    try {
      await createTrade(
        partnerId,
        tradeDraft.give,
        tradeDraft.want,
        tradeNote
      )

      setTradeNote('')
      router.replace(`/nachrichten/${partnerId}`)
    } catch (error) {
      setTradeError(error.message || 'Tauschanfrage konnte nicht gesendet werden.')
    } finally {
      setSendingTrade(false)
    }
  }

  const handleDismissTradeDraft = () => {
    setTradeNote('')
    router.replace(`/nachrichten/${partnerId}`)
  }

  const handleBack = () => {
    router.push('/nachrichten')
  }

  const handleDeleteConversation = async () => {
    setDeleteError('')
    setDeletingConversation(true)

    try {
      await deleteConversation(partnerId)
      router.push('/nachrichten')
    } catch (error) {
      setDeleteError(error.message)
      setShowDeleteModal(false)
    } finally {
      setDeletingConversation(false)
    }
  }

  const handleCompleteTrade = async (tradeId, stickersYouGet, stickersYouGive) => {
    try {
      await updateTradeStatus(tradeId, 'completed')
      
      // Auto-update stickers
      bulkAdd(stickersYouGet)
      bulkRemove(stickersYouGive)
      
      showToast('Tausch abgeschlossen! Sticker wurden aktualisiert.')
    } catch (error) {
      setMessageError(error.message || 'Fehler beim Abschliessen des Tauschs.')
    }
  }

  const handleOpenCounterOffer = (trade) => {
    setCounterOfferTradeId(trade.id)
    setCounterGive(trade.wantedStickers || []) // You give what they wanted
    setCounterWant(trade.offeredStickers || []) // You want what they offered
    setCounterNote('Mein Gegenangebot:')
    setCounterError('')
  }

  const handleSubmitCounterOffer = async () => {
    if (sendingCounter) return
    setSendingCounter(true)
    setCounterError('')

    try {
      await createCounterOffer(
        counterOfferTradeId,
        partnerId,
        counterGive,
        counterWant,
        counterNote
      )
      setCounterOfferTradeId(null)
      showToast('Gegenangebot gesendet!')
    } catch (err) {
      setCounterError(err.message || 'Fehler beim Senden des Gegenangebots.')
    } finally {
      setSendingCounter(false)
    }
  }

  const toggleCounterGive = (num) => {
    setCounterGive(prev => prev.includes(num) ? prev.filter(n => n !== num) : [...prev, num].sort((a,b)=>a-b))
  }
  
  const toggleCounterWant = (num) => {
    setCounterWant(prev => prev.includes(num) ? prev.filter(n => n !== num) : [...prev, num].sort((a,b)=>a-b))
  }

  return (
    <div className={styles.detailPage}>
      <div className={styles.detailTopBar}>
        <button className={styles.detailBack} onClick={handleBack} aria-label="Zurück zu Nachrichten">
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
        <button className="btn btn-secondary btn-sm" onClick={() => setShowDeleteModal(true)}>
          Chat löschen
        </button>
      </div>

      {deleteError ? (
        <div className={styles.searchInfo}>{deleteError}</div>
      ) : null}

      {syncError ? (
        <div className={styles.syncBanner}>
          <div>
            <strong>Verbindung wird gerade erneuert.</strong>
            <span>Dein Chat aktualisiert sich automatisch wieder.</span>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => refreshTrades({ silent: true })}>
            Neu laden
          </button>
        </div>
      ) : null}

      {!partner || loading ? (
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
              {tradeError ? (
                <div className={styles.inlineError}>{tradeError}</div>
              ) : null}
              <div className={styles.tradeActions}>
                <button className="btn btn-secondary btn-sm" onClick={handleDismissTradeDraft} disabled={sendingTrade}>
                  Verwerfen
                </button>
                <button className="btn btn-primary btn-sm" onClick={handleSendTradeDraft} disabled={sendingTrade}>
                  {sendingTrade ? 'Sendet...' : 'Anfrage senden'}
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
                        <button className="btn btn-outline-yellow btn-sm" onClick={() => handleOpenCounterOffer(trade)}>
                          Gegenangebot
                        </button>
                      </div>
                    )}

                    {!canRespond && canComplete && (
                      <div className={styles.tradeActions}>
                        <button className="btn btn-dark btn-sm" onClick={() => handleCompleteTrade(trade.id, stickersYouGet, stickersYouGive)}>
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
            <div className={styles.messageList} ref={messageListRef}>
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
              <div ref={messageEndRef} />
            </div>

            {messageError ? (
              <div className={styles.inlineErrorRow}>
                <span className={styles.inlineError}>{messageError}</span>
                {lastFailedDraft ? (
                  <button className="btn btn-secondary btn-sm" type="button" onClick={handleRetryMessage} disabled={sendingMessage}>
                    Erneut senden
                  </button>
                ) : null}
              </div>
            ) : null}

            {sendingMessage ? (
              <div className={styles.composerStatus}>Nachricht wird gesendet...</div>
            ) : null}

            <form className={styles.composer} onSubmit={handleSubmit}>
              <textarea
                className={styles.composerInput}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Nachricht schreiben..."
                rows={3}
              />
              <button className="btn btn-primary" type="submit" disabled={sendingMessage || !draft.trim()}>
                {sendingMessage ? 'Sendet...' : 'Senden'}
              </button>
            </form>
          </div>
        </>
      )}

      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content" onClick={(event) => event.stopPropagation()}>
            <div className="modal-handle" />
            <h3 style={{ marginBottom: 8 }}>Chat löschen?</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: 20, lineHeight: 1.5 }}>
              Dieser Chat und alle zugehörigen Tauschanfragen werden entfernt.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary btn-full" onClick={() => setShowDeleteModal(false)} disabled={deletingConversation}>
                Abbrechen
              </button>
              <button className="btn btn-full" style={{ background: 'var(--error)', color: 'white' }} onClick={handleDeleteConversation} disabled={deletingConversation}>
                {deletingConversation ? 'Löscht...' : 'Ja, Chat löschen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {counterOfferTradeId !== null && (
        <div className="modal-overlay" onClick={() => setCounterOfferTradeId(null)}>
          <div className="modal-content" onClick={(event) => event.stopPropagation()}>
            <div className="modal-handle" />
            <h3 style={{ marginBottom: 8 }}>Gegenangebot machen</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 20 }}>
              Wähle die Sticker aus, die du stattdessen tauschen möchtest.
            </p>
            
            <div className={styles.counterSection}>
              <span className={styles.tradeLabel}>Du gibst</span>
              <div className={styles.counterChips}>
                {[...new Set([...counterGive, ...partner?.stickers ? Object.keys(partner.stickers).filter(k => !stickers[k]).map(Number) : []])].sort((a,b)=>a-b).map(num => (
                   <button 
                     key={`give-${num}`}
                     className={`${styles.counterChip} ${counterGive.includes(num) ? styles.counterChipSelected : ''}`}
                     onClick={() => toggleCounterGive(num)}
                   >
                     #{num}
                   </button>
                ))}
              </div>
            </div>

            <div className={styles.counterSection} style={{ marginTop: 16 }}>
              <span className={styles.tradeLabel}>Du bekommst</span>
              <div className={styles.counterChips}>
                {[...new Set([...counterWant, ...Object.keys(stickers).filter(k => stickers[k] > 1).map(Number)])].sort((a,b)=>a-b).map(num => (
                   <button 
                     key={`want-${num}`}
                     className={`${styles.counterChip} ${counterWant.includes(num) ? styles.counterChipSelected : ''}`}
                     onClick={() => toggleCounterWant(num)}
                   >
                     #{num}
                   </button>
                ))}
              </div>
            </div>

            <div className="input-group" style={{ marginTop: 16 }}>
              <label>Nachricht</label>
              <textarea 
                className={styles.composerInput} 
                rows={2} 
                value={counterNote}
                onChange={e => setCounterNote(e.target.value)}
              />
            </div>
            
            {counterError && <p className={styles.inlineError} style={{ marginTop: 12 }}>{counterError}</p>}

            <div style={{ display: 'flex', gap: 8, marginTop: 24 }}>
              <button className="btn btn-secondary btn-full" onClick={() => setCounterOfferTradeId(null)} disabled={sendingCounter}>
                Abbrechen
              </button>
              <button className="btn btn-primary btn-full" onClick={handleSubmitCounterOffer} disabled={sendingCounter}>
                {sendingCounter ? 'Sendet...' : 'Angebot senden'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toastMessage && (
        <div className="toast toast-success">{toastMessage}</div>
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
