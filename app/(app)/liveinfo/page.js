'use client'

import { useEffect, useState } from 'react'
import styles from './liveinfo.module.css'

function formatStatNumber(value) {
  return new Intl.NumberFormat('de-DE').format(value || 0)
}

export default function LiveInfoPage() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function loadStats() {
      try {
        const response = await fetch('/api/presentation-stats', { cache: 'no-store' })
        const json = await response.json()

        if (!response.ok) {
          throw new Error(json.error || 'Live-Zahlen konnten nicht geladen werden.')
        }

        if (active) {
          setStats(json)
          setError('')
        }
      } catch (err) {
        if (active) {
          setError(err.message)
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadStats()

    return () => {
      active = false
    }
  }, [])

  const completedRate = stats?.totalTrades
    ? Math.round((stats.completedTrades / stats.totalTrades) * 100)
    : 0
  const platformCoverage = stats?.albumStickerTotal
    ? Math.round((stats.uniqueStickerNumbers / stats.albumStickerTotal) * 100)
    : 0

  const cards = stats ? [
    {
      label: 'Gesamtnutzer',
      value: stats.totalUsers,
      hint: `${formatStatNumber(stats.activeCollectors)} aktive Sammler`,
    },
    {
      label: 'Sticker eingetragen',
      value: stats.totalStickerCopies,
      hint: `${formatStatNumber(stats.uniqueStickerNumbers)} von ${formatStatNumber(stats.albumStickerTotal)} Nummern im Umlauf`,
    },
    {
      label: 'Doppelte Sticker',
      value: stats.totalDuplicateCopies,
      hint: `Tauschpotenzial in der Community`,
    },
    {
      label: 'Tausche gesamt',
      value: stats.totalTrades,
      hint: `${formatStatNumber(stats.completedTrades)} erledigt · ${completedRate}% Abschluss`,
    },
    {
      label: 'Offene Anfragen',
      value: stats.openTrades + stats.acceptedTrades,
      hint: `${formatStatNumber(stats.openTrades)} offen · ${formatStatNumber(stats.acceptedTrades)} angenommen`,
    },
    {
      label: 'Nachrichten',
      value: stats.totalMessages,
      hint: `${formatStatNumber(stats.activeTradePairs)} Tauschkontakte`,
    },
  ] : []

  return (
    <div className={styles.page} data-presentation-page="true">
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Liveinfo für Albumhersteller</span>
          <h1 className={styles.title}>Aus einem Stickeralbum wird eine aktive Vereinsplattform.</h1>
          <p className={styles.copy}>
            Die App macht sichtbar, wie viele Sammler erreicht werden, wie viel Tauschaktivität entsteht und warum digitale Begleitung den Wert weiterer Vereinsalben erhöht.
          </p>
        </div>
        <div className={styles.heroMetric}>
          <strong>{loading ? '...' : `${platformCoverage}%`}</strong>
          <span>Albumabdeckung in der Community</span>
        </div>
      </section>

      {error ? (
        <div className={styles.errorBox}>{error}</div>
      ) : null}

      <section className={styles.statsGrid} aria-label="Live-Zahlen">
        {loading ? (
          [0, 1, 2, 3, 4, 5].map((item) => (
            <div key={item} className={styles.skeletonCard} />
          ))
        ) : (
          cards.map((card) => (
            <article className={styles.statCard} key={card.label}>
              <span>{card.label}</span>
              <strong>{formatStatNumber(card.value)}</strong>
              <small>{card.hint}</small>
            </article>
          ))
        )}
      </section>

      <section className={styles.valueGrid}>
        <article className={styles.valueCard}>
          <span>Für Vereine</span>
          <h2>Mehr Aktivität nach dem Verkauf</h2>
          <p>Sammler bleiben im Austausch, vervollständigen ihre Alben und kommen häufiger zurück.</p>
        </article>
        <article className={styles.valueCard}>
          <span>Für Hersteller</span>
          <h2>Messbarer Mehrwert</h2>
          <p>Nutzung, Tauschverhalten und Community-Dynamik werden sichtbar statt nur vermutet.</p>
        </article>
        <article className={styles.valueCard}>
          <span>Für neue Projekte</span>
          <h2>Besseres Verkaufsargument</h2>
          <p>Das Album wird als Komplettpaket aus Print, Tauschbörse, Sammlung und Kommunikation angeboten.</p>
        </article>
      </section>

      <section className={styles.argumentBand}>
        <div>
          <span className={styles.eyebrow}>Warum das verkauft</span>
          <h2>Jedes neue Vereinsalbum bekommt eine digitale Bühne.</h2>
        </div>
        <p>
          Die App verlängert die Lebensdauer des Albums, senkt die Hürde zum Tauschen und gibt Vereinen einen modernen Kanal für Mitglieder, Familien und Fans.
        </p>
      </section>
    </div>
  )
}
