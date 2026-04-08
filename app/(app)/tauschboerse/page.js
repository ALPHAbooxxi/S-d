'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { useStickers } from '@/lib/stickers-context'
import { ArrowDownIcon, ArrowUpIcon, CloseIcon, CollectionIcon, SearchIcon } from '@/components/AppIcons'
import { createClient } from '@/lib/supabase/client'
import { findMatches, loadUserDirectory, syncUserDirectoryFromRemote } from '@/lib/matching'
import styles from './tauschboerse.module.css'

export default function TauschboersePage() {
  const { user } = useAuth()
  const { stickers, duplicateStickers, missingStickers } = useStickers()
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [searchNumber, setSearchNumber] = useState('')
  const [activeTab, setActiveTab] = useState('matches')
  const [directory, setDirectory] = useState(() => (user ? loadUserDirectory(user.id) : []))
  const [directoryLoading, setDirectoryLoading] = useState(false)
  const [directoryError, setDirectoryError] = useState('')
  const matches = useMemo(() => findMatches(stickers, directory), [directory, stickers])

  useEffect(() => {
    if (!user) {
      setDirectory([])
      return
    }

    setDirectory(loadUserDirectory(user.id))
  }, [user])

  const refreshDirectory = useCallback(async () => {
    if (!user) return

    setDirectoryLoading(true)
    setDirectoryError('')

    try {
      const nextDirectory = await syncUserDirectoryFromRemote(supabase, user.id)
      setDirectory(nextDirectory)
    } catch (error) {
      setDirectoryError(error.message || 'Tauschpartner konnten nicht neu geladen werden.')
    } finally {
      setDirectoryLoading(false)
    }
  }, [supabase, user])

  useEffect(() => {
    if (!user) return
    void refreshDirectory()
  }, [refreshDirectory, user])

  const filteredMatches = useMemo(() => {
    if (!searchNumber) return matches
    const num = parseInt(searchNumber)
    if (isNaN(num)) return matches
  return matches.filter(m =>
      m.theyCanGive.includes(num) || m.iCanGive.includes(num)
    )
  }, [matches, searchNumber])

  const hasStickers = Object.keys(stickers).length > 0

  const handleOpenConversation = (partnerId) => {
    router.push(`/nachrichten/${partnerId}`)
  }

  const handlePrepareTrade = (partner) => {
    const params = new URLSearchParams({
      intent: 'trade',
      give: (partner.iCanGive?.slice(0, 8) || []).join(','),
      want: (partner.theyCanGive?.slice(0, 8) || []).join(','),
    })

    router.push(`/nachrichten/${partner.userId}?${params.toString()}`)
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Tauschbörse</h1>
          <p className={styles.subtitle}>
            Automatische Match-Vorschlaege auf Basis deiner doppelten und fehlenden Sticker.
          </p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={refreshDirectory} disabled={directoryLoading}>
          {directoryLoading ? 'Aktualisiert...' : 'Aktualisieren'}
        </button>
      </div>

      {directoryError ? (
        <div className={styles.syncInfo}>{directoryError}</div>
      ) : null}

      {!hasStickers ? (
        <div className="empty-state">
          <span className="empty-state-icon"><CollectionIcon size={40} strokeWidth={1.8} /></span>
          <span className="empty-state-title">Noch keine Sticker eingetragen</span>
          <span className="empty-state-text">
            Trage zuerst deine Sticker in der Sammlung ein, damit wir passende Tauschpartner berechnen koennen.
          </span>
        </div>
      ) : (
        <>
          {/* Search */}
          <div className={styles.searchBar}>
            <SearchIcon size={16} strokeWidth={2.5} />
            <input
              type="number"
              className={styles.searchInput}
              value={searchNumber}
              onChange={(e) => setSearchNumber(e.target.value)}
              placeholder="Sticker-Nr. filtern..."
              min="1"
              max="708"
              id="search-sticker"
            />
            {searchNumber && (
              <button className={styles.clearSearch} onClick={() => setSearchNumber('')} aria-label="Filter leeren">
                <CloseIcon size={14} strokeWidth={2.4} />
              </button>
            )}
          </div>

          {/* Stats */}
          <div className={styles.quickStats}>
            <div className={styles.quickStat}>
              <span className={styles.quickStatNum}>{duplicateStickers.length}</span>
              <span className={styles.quickStatLabel}>Zum Tauschen</span>
            </div>
            <div className={styles.quickStat}>
              <span className={styles.quickStatNum}>{missingStickers.length}</span>
              <span className={styles.quickStatLabel}>Fehlen dir</span>
            </div>
            <div className={styles.quickStat}>
              <span className={styles.quickStatNum}>{matches.length}</span>
              <span className={styles.quickStatLabel}>Partner</span>
            </div>
          </div>

          {/* Tabs */}
          <div className={styles.tabs}>
            <button className={`${styles.tab} ${activeTab === 'matches' ? styles.activeTab : ''}`} onClick={() => setActiveTab('matches')}>
              Matches
            </button>
            <button className={`${styles.tab} ${activeTab === 'missing' ? styles.activeTab : ''}`} onClick={() => setActiveTab('missing')}>
              Fehlende
            </button>
            <button className={`${styles.tab} ${activeTab === 'duplicates' ? styles.activeTab : ''}`} onClick={() => setActiveTab('duplicates')}>
              Doppelte
            </button>
          </div>

          {/* Match List */}
          {activeTab === 'matches' && (
            <div className={styles.matchList}>
              {filteredMatches.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-state-icon"><SearchIcon size={40} strokeWidth={1.8} /></span>
                  <span className="empty-state-title">
                    {searchNumber ? 'Kein Ergebnis' : 'Noch keine Tauschpartner'}
                  </span>
                  <span className="empty-state-text">
                    {searchNumber
                      ? `Niemand hat Sticker #${searchNumber} zum Tauschen.`
                      : directoryLoading
                      ? 'Tauschpartner werden gerade neu geladen.'
                      : 'Sobald sich mehr Nutzer registrieren, findest du hier passende Tauschpartner!'
                    }
                  </span>
                </div>
              ) : (
                filteredMatches.map((match, idx) => (
                  <div key={match.userId} className={styles.matchCard} style={{ animationDelay: `${idx * 50}ms` }}>
                    <div className={styles.matchHeader}>
                      <div className={styles.matchAvatar}>
                        {(match.displayName || match.username).charAt(0).toUpperCase()}
                      </div>
                      <div className={styles.matchInfo}>
                        <span className={styles.matchName}>{match.displayName || match.username}</span>
                        <span className={styles.matchUsername}>@{match.username}</span>
                      </div>
                      <div className={styles.matchScore}>
                        <span className={styles.matchScoreNum}>{match.mutualCount}</span>
                        <span className={styles.matchScoreLabel}>Tausche</span>
                      </div>
                    </div>

                    <div className={styles.matchStickers}>
                      {match.theyCanGive.length > 0 && (
                        <div className={styles.matchRow}>
                          <span className={styles.matchRowLabel}>
                            <span className={styles.matchArrow}><ArrowDownIcon size={13} strokeWidth={2.3} /></span> Du bekommst
                          </span>
                          <div className={styles.stickerChips}>
                            {match.theyCanGive.slice(0, 8).map(n => (
                              <span key={n} className={`${styles.stickerChip} ${styles.chipReceive}`}>#{n}</span>
                            ))}
                            {match.theyCanGive.length > 8 && (
                              <span className={styles.chipMore}>+{match.theyCanGive.length - 8}</span>
                            )}
                          </div>
                        </div>
                      )}
                      {match.iCanGive.length > 0 && (
                        <div className={styles.matchRow}>
                          <span className={styles.matchRowLabel}>
                            <span className={styles.matchArrow}><ArrowUpIcon size={13} strokeWidth={2.3} /></span> Du gibst
                          </span>
                          <div className={styles.stickerChips}>
                            {match.iCanGive.slice(0, 8).map(n => (
                              <span key={n} className={`${styles.stickerChip} ${styles.chipGive}`}>#{n}</span>
                            ))}
                            {match.iCanGive.length > 8 && (
                              <span className={styles.chipMore}>+{match.iCanGive.length - 8}</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className={styles.matchActions}>
                      <span className={styles.contactBadge}>Erst Match pruefen, dann im Chat konkret anfragen</span>
                      <button className="btn btn-secondary btn-sm" onClick={() => handleOpenConversation(match.userId)}>
                        Chat oeffnen
                      </button>
                      <button className="btn btn-dark btn-sm" id={`trade-${match.userId}`} onClick={() => handlePrepareTrade(match)}>
                        Tausch vorbereiten
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'missing' && (
            <div className={styles.numberList}>
              <p className={styles.listInfo}>Dir fehlen noch <strong>{missingStickers.length}</strong> von 708 Stickern:</p>
              <div className={styles.numberChips}>
                {missingStickers.map(n => (
                  <span key={n} className={`${styles.stickerChip} ${styles.chipMissing}`}>#{n}</span>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'duplicates' && (
            <div className={styles.numberList}>
              <p className={styles.listInfo}>Du hast <strong>{duplicateStickers.length}</strong> verschiedene Sticker doppelt:</p>
              <div className={styles.numberChips}>
                {duplicateStickers.map(s => (
                  <span key={s.number} className={`${styles.stickerChip} ${styles.chipDuplicate}`}>
                    #{s.number} <small>({s.quantity}×)</small>
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
