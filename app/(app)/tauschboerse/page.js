'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { useStickers } from '@/lib/stickers-context'
import { ArrowDownIcon, ArrowUpIcon, CloseIcon, CollectionIcon, SearchIcon } from '@/components/AppIcons'
import SwipeableModal from '@/components/SwipeableModal'
import { createClient } from '@/lib/supabase/client'
import { findMatches, loadUserDirectory, syncUserDirectoryFromRemote } from '@/lib/matching'
import styles from './tauschboerse.module.css'

const MATCH_MODES = [
  {
    id: 'goodTrades',
    label: 'Viele gute Tausche',
    helper: 'beidseitig passend',
  },
  {
    id: 'iCanGiveMost',
    label: 'Ich kann am meisten geben',
    helper: 'deine Doppelten',
  },
  {
    id: 'theyCanGiveMost',
    label: 'Kann mir am meisten geben',
    helper: 'deine Fehlenden',
  },
]

function compareByName(a, b) {
  return (a.username || '').localeCompare(b.username || '', 'de', { sensitivity: 'base' })
}

function sortMatches(matches, mode) {
  return [...matches].sort((a, b) => {
    if (mode === 'iCanGiveMost') {
      return (
        b.iCanGive.length - a.iCanGive.length ||
        b.mutualCount - a.mutualCount ||
        b.theyCanGive.length - a.theyCanGive.length ||
        compareByName(a, b)
      )
    }

    if (mode === 'theyCanGiveMost') {
      return (
        b.theyCanGive.length - a.theyCanGive.length ||
        b.mutualCount - a.mutualCount ||
        b.iCanGive.length - a.iCanGive.length ||
        compareByName(a, b)
      )
    }

    return (
      b.mutualCount - a.mutualCount ||
      b.totalTradeable - a.totalTradeable ||
      b.theyCanGive.length - a.theyCanGive.length ||
      b.iCanGive.length - a.iCanGive.length ||
      compareByName(a, b)
    )
  })
}

function getMatchesForMode(matches, mode) {
  if (mode === 'iCanGiveMost') {
    return sortMatches(matches.filter((match) => match.iCanGive.length > 0), mode)
  }

  if (mode === 'theyCanGiveMost') {
    return sortMatches(matches.filter((match) => match.theyCanGive.length > 0), mode)
  }

  return sortMatches(matches.filter((match) => match.mutualCount > 0), mode)
}

function getMatchMetric(match, mode) {
  if (mode === 'iCanGiveMost') {
    return { value: match.iCanGive.length, label: 'Du gibst' }
  }

  if (mode === 'theyCanGiveMost') {
    return { value: match.theyCanGive.length, label: 'Du bekommst' }
  }

  return { value: match.mutualCount, label: 'gute Tausche' }
}

function getEmptyMatchText(mode, searchNumber, directoryLoading) {
  if (searchNumber) {
    return {
      title: 'Kein Ergebnis',
      text: `Kein Partner im aktuellen Filter passt zu Sticker #${searchNumber}.`,
    }
  }

  if (directoryLoading) {
    return {
      title: 'Tauschpartner werden geladen',
      text: 'Die Vorschlaege werden gerade neu berechnet.',
    }
  }

  if (mode === 'iCanGiveMost') {
    return {
      title: 'Du kannst gerade niemandem helfen',
      text: 'Sobald deine doppelten Sticker anderen fehlen, findest du hier passende Partner.',
    }
  }

  if (mode === 'theyCanGiveMost') {
    return {
      title: 'Dir kann gerade niemand helfen',
      text: 'Sobald andere deine fehlenden Sticker doppelt haben, tauchen sie hier auf.',
    }
  }

  return {
    title: 'Noch keine guten Tausche',
    text: 'Gute Tausche brauchen beide Richtungen: Jemand hat etwas fuer dich und du hast etwas fuer diese Person.',
  }
}

export default function TauschboersePage() {
  const { user } = useAuth()
  const { stickers, duplicateStickers, missingStickers } = useStickers()
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [searchNumber, setSearchNumber] = useState('')
  const [matchMode, setMatchMode] = useState('goodTrades')
  const [matchFilterOpen, setMatchFilterOpen] = useState(false)
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

  const matchModeCounts = useMemo(() => ({
    goodTrades: matches.filter((match) => match.mutualCount > 0).length,
    iCanGiveMost: matches.filter((match) => match.iCanGive.length > 0).length,
    theyCanGiveMost: matches.filter((match) => match.theyCanGive.length > 0).length,
  }), [matches])

  const filteredMatches = useMemo(() => {
    const modeMatches = getMatchesForMode(matches, matchMode)

    if (!searchNumber) return modeMatches

    const num = parseInt(searchNumber, 10)
    if (isNaN(num)) return modeMatches

    return modeMatches.filter(m =>
      m.theyCanGive.includes(num) || m.iCanGive.includes(num)
    )
  }, [matches, matchMode, searchNumber])

  const emptyMatchText = getEmptyMatchText(matchMode, searchNumber, directoryLoading)
  const activeMatchMode = MATCH_MODES.find((mode) => mode.id === matchMode) || MATCH_MODES[0]

  const hasStickers = Object.keys(stickers).length > 0

  const handleOpenConversation = (partnerId) => {
    router.push(`/nachrichten/${partnerId}`)
  }

  const handleSelectMatchMode = (modeId) => {
    setMatchMode(modeId)
    setMatchFilterOpen(false)
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

          <div
            className={styles.matchFilterDropdown}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) {
                setMatchFilterOpen(false)
              }
            }}
          >
            <button
              type="button"
              className={styles.matchFilterTrigger}
              onClick={() => setMatchFilterOpen((current) => !current)}
              aria-haspopup="listbox"
              aria-expanded={matchFilterOpen}
            >
              <span className={styles.matchFilterTriggerText}>
                <small>Sortierung</small>
                <strong>{activeMatchMode.label}</strong>
                <em>{matchModeCounts[activeMatchMode.id]} Partner · {activeMatchMode.helper}</em>
              </span>
              <span className={`${styles.matchFilterChevron} ${matchFilterOpen ? styles.matchFilterChevronOpen : ''}`} aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="m7 10 5 5 5-5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </button>

            {matchFilterOpen ? (
              <div className={styles.matchFilterMenu} role="listbox" aria-label="Tauschpartner sortieren">
                {MATCH_MODES.map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    className={`${styles.matchFilterOption} ${matchMode === mode.id ? styles.activeMatchFilterOption : ''}`}
                    onClick={() => handleSelectMatchMode(mode.id)}
                    role="option"
                    aria-selected={matchMode === mode.id}
                  >
                    <span>
                      <strong>{mode.label}</strong>
                      <small>{matchModeCounts[mode.id]} Partner · {mode.helper}</small>
                    </span>
                    {matchMode === mode.id ? (
                      <span className={styles.matchFilterCheck} aria-hidden="true">✓</span>
                    ) : null}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className={styles.matchList}>
            {filteredMatches.length === 0 ? (
              <div className="empty-state">
                <span className="empty-state-icon"><SearchIcon size={40} strokeWidth={1.8} /></span>
                <span className="empty-state-title">{emptyMatchText.title}</span>
                <span className="empty-state-text">{emptyMatchText.text}</span>
              </div>
            ) : (
              filteredMatches.map((match, idx) => {
                const matchMetric = getMatchMetric(match, matchMode)

                return (
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
                        <span className={styles.matchScoreNum}>{matchMetric.value}</span>
                        <span className={styles.matchScoreLabel}>{matchMetric.label}</span>
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
                )
              })
            )}
          </div>
        </>
      )}

      {selectedMatch && (
        <SwipeableModal onClose={closeMatchDetails} contentClassName={styles.matchSheet}>
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
        </SwipeableModal>
      )}
    </div>
  )
}
