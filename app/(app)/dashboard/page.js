'use client'

import Link from 'next/link'
import { useMemo, useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { ALBUM_CONFIG, useStickers } from '@/lib/stickers-context'
import { useTrades } from '@/lib/trades-context'
import AlbumOverview from '@/components/AlbumOverview'
import ProgressRing from '@/components/ProgressRing'
import styles from './dashboard.module.css'

// Neu: Leaderboard Tab Component
function LeaderboardTab() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadLeaderboard() {
      try {
        const response = await fetch('/api/leaderboard')
        if (!response.ok) {
          throw new Error('Fehler beim Laden des Leaderboards')
        }
        const json = await response.json()
        setData(json)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    loadLeaderboard()
  }, [])

  if (loading) {
    return (
      <div className={styles.leaderboardLoading}>
        <div className="spinner" />
        <span>Lade Top 50...</span>
      </div>
    )
  }

  if (error) {
    return <div className={styles.emptyCard}>{error}</div>
  }

  const { leaderboard, currentUserRank, totalStickers } = data

  if (!leaderboard || leaderboard.length === 0) {
    return (
      <div className={styles.emptyCard}>
        Noch keine Nutzer mit Stickern vorhanden. 
        Sei der Erste, der seine Sammlung einträgt!
      </div>
    )
  }

  return (
    <div className={styles.leaderboardContainer}>
      <p className={styles.leaderboardCopy}>
        Die Top 50 Sammler auf der Plattform. Wer füllt sein Album zuerst?
      </p>
      
      <div className={styles.leaderboardList}>
        {leaderboard.map((user, index) => {
          const isTop3 = index < 3;
          return (
            <div key={user.userId} className={`${styles.leaderboardItem} ${user.isCurrentUser ? styles.leaderboardItemCurrent : ''}`}>
              <div className={styles.leaderboardItemLeft}>
                <div className={`${styles.leaderboardRank} ${isTop3 ? styles.leaderboardRankTop : ''}`}>
                  {isTop3 ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                      <path d="M2.213 18.252A2.003 2.003 0 0 1 2 17.5V7a2 2 0 0 1 3.844-0.781l3.656 4.875 1.587-6.35a2 2 0 0 1 3.826 0l1.587 6.35 3.655-4.874A2 2 0 0 1 22 7v10.5a2.003 2.003 0 0 1-.213.752l-2.029 4.058A2.002 2.002 0 0 1 17.969 23H6.03a2.002 2.002 0 0 1-1.789-1.096L2.213 18.252z"/>
                    </svg>
                  ) : (
                    <span>{user.rank}</span>
                  )}
                </div>
                <div className={styles.leaderboardAvatar}>
                  {user.displayName.charAt(0).toUpperCase()}
                </div>
                <div className={styles.leaderboardUserInfo}>
                  <span className={styles.leaderboardUserName}>
                    {user.displayName} {user.isCurrentUser && '(Du)'}
                  </span>
                  <span className={styles.leaderboardUserHandle}>@{user.username}</span>
                </div>
              </div>
              
              <div className={styles.leaderboardItemRight}>
                <div className={styles.leaderboardStats}>
                  <strong>{user.ownedCount}</strong>
                  <span>von {totalStickers}</span>
                </div>
                <div className={styles.leaderboardTrack}>
                  <div 
                    className={styles.leaderboardBar} 
                    style={{ width: `${user.progress}%`, background: isTop3 ? 'linear-gradient(90deg, #F0D52E, #C4A701)' : '' }} 
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {currentUserRank && (
        <div className={styles.currentUserFloatingRank}>
          <div className={styles.leaderboardItemCurrent}>
            {/* similar layout for current user when not in top 50 */}
             <div className={styles.leaderboardItemLeft}>
                <div className={styles.leaderboardRank}>
                  <span>{currentUserRank.rank}</span>
                </div>
                <div className={styles.leaderboardAvatar}>
                  {currentUserRank.displayName.charAt(0).toUpperCase()}
                </div>
                <div className={styles.leaderboardUserInfo}>
                  <span className={styles.leaderboardUserName}>
                    {currentUserRank.displayName} (Du)
                  </span>
                  <span className={styles.leaderboardUserHandle}>@{currentUserRank.username}</span>
                </div>
              </div>
              <div className={styles.leaderboardItemRight}>
                <div className={styles.leaderboardStats}>
                  <strong>{currentUserRank.ownedCount}</strong>
                  <span>von {totalStickers}</span>
                </div>
              </div>
          </div>
        </div>
      )}
    </div>
  )
}

const GROUP_LABELS = {
  fussball: 'Fußball',
  handball: 'Handball',
  weitere: 'Weitere Bereiche',
}

function getNumbersForRange([start, end]) {
  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
}

export default function DashboardPage() {
  const { user } = useAuth()
  const { stickers, ownedStickers, missingStickers, duplicateStickers, progress, totalDuplicates } = useStickers()
  const { trades, incomingTrades, outgoingTrades, unreadCount, getConversations } = useTrades()
  const [activeTab, setActiveTab] = useState('overview')

  const conversations = getConversations()

  const categoryStats = useMemo(() => {
    return ALBUM_CONFIG.categories.map((category) => {
      const numbers = getNumbersForRange(category.range)
      const ownedCount = numbers.filter((number) => (stickers[number] || 0) > 0).length
      const duplicateCount = numbers.reduce(
        (sum, number) => sum + Math.max(0, (stickers[number] || 0) - 1),
        0
      )
      const missingCount = numbers.length - ownedCount

      return {
        ...category,
        total: numbers.length,
        ownedCount,
        duplicateCount,
        missingCount,
        progress: numbers.length ? (ownedCount / numbers.length) * 100 : 0,
      }
    })
  }, [stickers])

  const groupStats = useMemo(() => {
    return Object.keys(GROUP_LABELS).map((groupId) => {
      const categories = categoryStats.filter((category) => category.group === groupId)
      const total = categories.reduce((sum, category) => sum + category.total, 0)
      const ownedCount = categories.reduce((sum, category) => sum + category.ownedCount, 0)
      const missingCount = categories.reduce((sum, category) => sum + category.missingCount, 0)

      return {
        id: groupId,
        label: GROUP_LABELS[groupId],
        total,
        ownedCount,
        missingCount,
        progress: total ? (ownedCount / total) * 100 : 0,
      }
    })
  }, [categoryStats])

  const completedCategories = categoryStats.filter((category) => category.missingCount === 0).length
  const closestCategory = [...categoryStats]
    .filter((category) => category.missingCount > 0)
    .sort((a, b) => a.missingCount - b.missingCount || b.progress - a.progress)[0]
  const biggestGapCategory = [...categoryStats]
    .filter((category) => category.missingCount > 0)
    .sort((a, b) => b.missingCount - a.missingCount || a.progress - b.progress)[0]
  const strongestGroup = [...groupStats].sort((a, b) => b.progress - a.progress)[0]

  const tradeCompletionRate = trades.length
    ? Math.round((trades.filter((trade) => trade.status === 'completed').length / trades.length) * 100)
    : 0

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div>
            <h1 className={styles.title}>Dashboard</h1>
            <p className={styles.subtitle}>
              Hallo {user?.displayName || user?.username}, hier siehst du deinen aktuellen Albumstand, deine Tauschaktivität und wo dir noch am meisten Sticker fehlen.
            </p>
          </div>
          <Link className={styles.profileLink} href="/profil" aria-label="Profil öffnen">
            <span>{(user?.displayName || user?.username || 'P').charAt(0).toUpperCase()}</span>
          </Link>
        </div>
      </header>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button 
          className={`${styles.tab} ${activeTab === 'overview' ? styles.activeTab : ''}`} 
          onClick={() => setActiveTab('overview')}
        >
          Übersicht
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'leaderboard' ? styles.activeTab : ''}`} 
          onClick={() => setActiveTab('leaderboard')}
        >
          🏆 Leaderboard
        </button>
      </div>

      {activeTab === 'leaderboard' ? (
        <LeaderboardTab />
      ) : (
        <>
          <section className={styles.heroCard}>
            <div className={styles.heroRing}>
              <ProgressRing progress={progress} size={110} strokeWidth={9} label="komplett" />
            </div>
            <div>
              <span className={styles.heroEyebrow}>Gesamtfortschritt</span>
              <h2 className={styles.heroTitle}>
                {ownedStickers.length} von {ALBUM_CONFIG.totalStickers} Stickern sind schon eingetragen.
              </h2>
              <p className={styles.heroText}>
                Dir fehlen noch {missingStickers.length} Sticker, und du hast aktuell {totalDuplicates} doppelte Sticker als gute Basis für die Tauschbörse.
              </p>
            </div>
          </section>

          <section className={styles.quickStats}>
            <article className={styles.statCard}>
              <span className={styles.statLabel}>Gesammelt</span>
              <strong className={styles.statValue}>{ownedStickers.length}</strong>
              <span className={styles.statHint}>von {ALBUM_CONFIG.totalStickers} im Album</span>
            </article>
            <article className={styles.statCard}>
              <span className={styles.statLabel}>Fehlen noch</span>
              <strong className={styles.statValue}>{missingStickers.length}</strong>
              <span className={styles.statHint}>offene Plätze bis voll</span>
            </article>
            <article className={styles.statCard}>
              <span className={styles.statLabel}>Doppelte</span>
              <strong className={styles.statValue}>{totalDuplicates}</strong>
              <span className={styles.statHint}>{duplicateStickers.length} verschiedene Nummern</span>
            </article>
            <article className={styles.statCard}>
              <span className={styles.statLabel}>Ungelesen</span>
              <strong className={styles.statValue}>{unreadCount}</strong>
              <span className={styles.statHint}>{conversations.length} aktive Chats</span>
            </article>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <div>
                <h2 className={styles.sectionTitle}>Sinnvolle Statistiken für dich</h2>
                <p className={styles.sectionCopy}>
                  Hier siehst du auf einen Blick, wo du schon stark bist und welche Bereiche sich für die nächsten Sticker oder Tauschaktionen am meisten lohnen.
                </p>
              </div>
            </div>

            <div className={styles.insightGrid}>
              <article className={styles.insightCard}>
                <div className={styles.insightTop}>
                  <div>
                    <span className={styles.insightLabel}>Komplett</span>
                    <h3 className={styles.insightTitle}>Fertige Kategorien</h3>
                  </div>
                  <span className={styles.insightMeta}>{completedCategories}</span>
                </div>
                <p className={styles.insightText}>
                  Schon vollständig gesammelt: {completedCategories} von {ALBUM_CONFIG.categories.length} Kategorien.
                </p>
              </article>

              <article className={styles.insightCard}>
                <div className={styles.insightTop}>
                  <div>
                    <span className={styles.insightLabel}>Nächster Abschluss</span>
                    <h3 className={styles.insightTitle}>
                      {closestCategory ? closestCategory.name : 'Alles vollständig'}
                    </h3>
                  </div>
                  <span className={styles.insightMeta}>
                    {closestCategory ? `${closestCategory.missingCount} offen` : '100%'}
                  </span>
                </div>
                <p className={styles.insightText}>
                  {closestCategory
                    ? `Diesen Bereich kannst du als Nächstes abschließen. Es fehlen nur noch ${closestCategory.missingCount} Sticker und du bist dort schon bei ${Math.round(closestCategory.progress)}%.`
                    : 'Stark: Alle Kategorien sind bereits komplett ausgefüllt.'}
                </p>
              </article>

              <article className={styles.insightCard}>
                <div className={styles.insightTop}>
                  <div>
                    <span className={styles.insightLabel}>Größte Lücke</span>
                    <h3 className={styles.insightTitle}>
                      {biggestGapCategory ? biggestGapCategory.name : 'Keine offene Lücke'}
                    </h3>
                  </div>
                  <span className={styles.insightMeta}>
                    {biggestGapCategory ? `${biggestGapCategory.missingCount} fehlen` : '0'}
                  </span>
                </div>
                <p className={styles.insightText}>
                  {biggestGapCategory
                    ? `Hier fehlt dir aktuell am meisten. Wenn du gezielt tauschen willst, lohnt sich dieser Bereich besonders.`
                    : 'Im Moment gibt es keine offenen Lücken mehr.'}
                </p>
              </article>

              <article className={styles.insightCard}>
                <div className={styles.insightTop}>
                  <div>
                    <span className={styles.insightLabel}>Stärkster Bereich</span>
                    <h3 className={styles.insightTitle}>
                      {strongestGroup ? strongestGroup.label : 'Noch offen'}
                    </h3>
                  </div>
                  <span className={styles.insightMeta}>
                    {strongestGroup ? `${Math.round(strongestGroup.progress)}%` : '0%'}
                  </span>
                </div>
                <p className={styles.insightText}>
                  {strongestGroup
                    ? `Hier bist du am weitesten: ${strongestGroup.ownedCount} von ${strongestGroup.total} Stickern sind schon drin.`
                    : 'Sobald du Sticker einträgst, erscheint hier dein stärkster Bereich.'}
                </p>
              </article>

              <article className={styles.insightCard}>
                <div className={styles.insightTop}>
                  <div>
                    <span className={styles.insightLabel}>Tauschaktivität</span>
                    <h3 className={styles.insightTitle}>Offene Tauschanfragen</h3>
                  </div>
                  <span className={styles.insightMeta}>{incomingTrades.length + outgoingTrades.length}</span>
                </div>
                <p className={styles.insightText}>
                  {incomingTrades.length} eingehend, {outgoingTrades.length} ausgehend. Insgesamt wurden bisher {trades.length} Tauschanfragen angelegt.
                </p>
              </article>

              <article className={styles.insightCard}>
                <div className={styles.insightTop}>
                  <div>
                    <span className={styles.insightLabel}>Abschlussquote</span>
                    <h3 className={styles.insightTitle}>Erledigte Tausche</h3>
                  </div>
                  <span className={styles.insightMeta}>{tradeCompletionRate}%</span>
                </div>
                <p className={styles.insightText}>
                  So viel deiner bisherigen Tauschanfragen wurden bereits als erledigt markiert. Das hilft dir einzuschätzen, wie aktiv deine Kontakte wirklich sind.
                </p>
              </article>
            </div>
          </section>

          {ownedStickers.length === 0 ? (
            <div className={styles.emptyCard}>
              Trage zuerst in der Sammlung deine ersten Sticker ein. Danach siehst du hier automatisch genauere Fortschrittswerte für Fußball, Handball und alle weiteren Bereiche.
            </div>
          ) : (
            <AlbumOverview />
          )}
        </>
      )}
    </div>
  )
}
