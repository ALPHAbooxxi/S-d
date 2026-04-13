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
  const [selectedMatch, setSelectedMatch] = useState(null)
  const [selectedGive, setSelectedGive] = useState([])
  const [selectedWant, setSelectedWant] = useState([])
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

  const openMatchDetails = (match) => {
    setSelectedMatch(match)
    setSelectedGive(match.iCanGive || [])
    setSelectedWant(match.theyCanGive || [])
  }

  const closeMatchDetails = () => {
    setSelectedMatch(null)
    setSelectedGive([])
    setSelectedWant([])
  }

  const toggleStickerSelection = (number, selection, setSelection) => {
    setSelection((current) =>
      current.includes(number)
        ? current.filter((entry) => entry !== number)
        : [...current, number].sort((a, b) => a - b)
    )
  }

  const handlePrepareTrade = (partner, options = {}) => {
    const giveList = options.give ?? partner.iCanGive ?? []
    const wantList = options.want ?? partner.theyCanGive ?? []
    const params = new URLSearchParams({
      intent: 'trade',
      give: giveList.join(','),
      want: wantList.join(','),
    })

    router.push(`/nachrichten/${partner.userId}?${params.toString()}`)
  }

  const selectedTradeReady =
    selectedMatch &&
    (selectedGive.length > 0 || selectedWant.length > 0)

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Tauschbörse</h1>
          <p className={styles.subtitle}>
            Automatische Match-Vorschlaege auf Basis deiner doppelten und fehlenden Sticker.
          </p>
        </div>
      </div>

      {directoryError ? (
        <div className={styles.syncInfo}>
          <span>{directoryError}</span>
          <button type="button" onClick={refreshDirectory} disabled={directoryLoading}>
            {directoryLoading ? 'Lädt...' : 'Neu versuchen'}
          </button>
        </div>
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
                  <div
                    key={match.userId}
                    className={styles.matchCard}
                    style={{ animationDelay: `${idx * 50}ms` }}
                    onClick={() => openMatchDetails(match)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        openMatchDetails(match)
                      }
                    }}
                  >
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
                      <button className={`${styles.matchActionButton} ${styles.matchActionChat}`} onClick={(event) => {
                        event.stopPropagation()
                        handleOpenConversation(match.userId)
                      }}>
                        Chat öffnen
                      </button>
                      <button className={`${styles.matchActionButton} ${styles.matchActionOffer}`} id={`trade-${match.userId}`} onClick={(event) => {
                        event.stopPropagation()
                        openMatchDetails(match)
                      }}>
                        Angebot prüfen
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

      {selectedMatch && (
        <div className="modal-overlay" onClick={closeMatchDetails}>
          <div className={`modal-content ${styles.matchSheet}`} onClick={(event) => event.stopPropagation()}>
            <div className="modal-handle" />
            <div className={styles.sheetHeader}>
              <div className={styles.sheetIdentity}>
                <div className={styles.matchAvatar}>
                  {(selectedMatch.displayName || selectedMatch.username).charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className={styles.sheetTitle}>{selectedMatch.displayName || selectedMatch.username}</h2>
                  <p className={styles.sheetSubtitle}>@{selectedMatch.username} · {selectedMatch.totalTradeable} mögliche Sticker</p>
                </div>
              </div>
              <button className={styles.sheetClose} onClick={closeMatchDetails} aria-label="Schließen">
                <CloseIcon size={16} strokeWidth={2.4} />
              </button>
            </div>

            <div className={styles.sheetStats}>
              <div className={styles.sheetStat}>
                <strong>{selectedMatch.theyCanGive.length}</strong>
                <span>für dich möglich</span>
              </div>
              <div className={styles.sheetStat}>
                <strong>{selectedMatch.iCanGive.length}</strong>
                <span>von dir möglich</span>
              </div>
              <div className={styles.sheetStat}>
                <strong>{selectedMatch.mutualCount}</strong>
                <span>gute Tausche</span>
              </div>
            </div>

            <div className={styles.sheetSection}>
              <div className={styles.sheetSectionTop}>
                <div>
                  <span className={styles.sheetEyebrow}>Du bekommst</span>
                  <h3 className={styles.sheetSectionTitle}>Wähle aus, was du haben möchtest</h3>
                </div>
                <span className={styles.selectionCount}>{selectedWant.length} gewählt</span>
              </div>
              {selectedMatch.theyCanGive.length === 0 ? (
                <p className={styles.sheetEmpty}>Dieser Kontakt hat aktuell keinen deiner fehlenden Sticker doppelt.</p>
              ) : (
                <div className={styles.sheetChipGrid}>
                  {selectedMatch.theyCanGive.map((number) => (
                    <button
                      key={`want-${number}`}
                      type="button"
                      className={`${styles.selectChip} ${styles.selectChipReceive} ${selectedWant.includes(number) ? styles.selectChipActive : ''}`}
                      onClick={() => toggleStickerSelection(number, selectedWant, setSelectedWant)}
                    >
                      #{number}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className={styles.sheetSection}>
              <div className={styles.sheetSectionTop}>
                <div>
                  <span className={styles.sheetEyebrow}>Du gibst</span>
                  <h3 className={styles.sheetSectionTitle}>Wähle aus, was du dafür tauschen würdest</h3>
                </div>
                <span className={styles.selectionCount}>{selectedGive.length} gewählt</span>
              </div>
              {selectedMatch.iCanGive.length === 0 ? (
                <p className={styles.sheetEmpty}>Du hast für diesen Kontakt aktuell keinen passenden doppelten Sticker.</p>
              ) : (
                <div className={styles.sheetChipGrid}>
                  {selectedMatch.iCanGive.map((number) => (
                    <button
                      key={`give-${number}`}
                      type="button"
                      className={`${styles.selectChip} ${styles.selectChipGive} ${selectedGive.includes(number) ? styles.selectChipActive : ''}`}
                      onClick={() => toggleStickerSelection(number, selectedGive, setSelectedGive)}
                    >
                      #{number}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className={styles.sheetActions}>
              <button
                className={`${styles.matchActionButton} ${styles.matchActionChat}`}
                onClick={() => handleOpenConversation(selectedMatch.userId)}
              >
                Chat öffnen
              </button>
              <button
                className={`${styles.matchActionButton} ${styles.matchActionOffer}`}
                onClick={() => handlePrepareTrade(selectedMatch, { give: selectedGive, want: selectedWant })}
                disabled={!selectedTradeReady}
              >
                Auswahl übernehmen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
