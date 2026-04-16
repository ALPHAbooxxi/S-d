'use client'

import { useState } from 'react'
import StickerGrid from '@/components/StickerGrid'
import { ALBUM_CONFIG, useStickers } from '@/lib/stickers-context'
import styles from './sammlung.module.css'

export default function SammlungPage() {
  const { duplicateStickers, missingStickers } = useStickers()
  const [openLists, setOpenLists] = useState({
    missing: false,
    duplicates: false,
  })

  const toggleList = (listId) => {
    setOpenLists((current) => ({
      ...current,
      [listId]: !current[listId],
    }))
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Sammlung</h1>
        <p className={styles.copy}>
          Hier bearbeitest du nur deine aktuelle Sammlung. Füge Sticker hinzu, erhöhe doppelte Exemplare oder entferne vorhandene Einträge wieder.
        </p>
      </div>

      <section className={styles.overview} aria-labelledby="collection-overview-title">
        <div className={styles.overviewHeader}>
          <div>
            <span className={styles.eyebrow}>Gesamtübersicht</span>
            <h2 className={styles.sectionTitle} id="collection-overview-title">Fehlende und doppelte Sticker</h2>
          </div>
          <span className={styles.totalCount}>{ALBUM_CONFIG.totalStickers} Sticker</span>
        </div>

        <div className={styles.summaryGrid}>
          <div className={styles.summaryItem}>
            <strong>{missingStickers.length}</strong>
            <span>fehlen dir</span>
          </div>
          <div className={styles.summaryItem}>
            <strong>{duplicateStickers.length}</strong>
            <span>doppelt vorhanden</span>
          </div>
        </div>

        <div className={styles.overviewBlock}>
          <button
            className={styles.blockToggle}
            type="button"
            onClick={() => toggleList('missing')}
            aria-expanded={openLists.missing}
            aria-controls="missing-stickers-list"
          >
            <span className={styles.blockToggleText}>
              <strong>Fehlende</strong>
              <small>{missingStickers.length} Sticker</small>
            </span>
            <span className={styles.blockToggleRight}>
              <span>{missingStickers.length}</span>
              <svg
                className={openLists.missing ? styles.chevronOpen : ''}
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <path d="m7 10 5 5 5-5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </button>
          {openLists.missing ? (
            <div id="missing-stickers-list">
              {missingStickers.length === 0 ? (
                <p className={styles.emptyText}>Stark, dir fehlt aktuell kein Sticker.</p>
              ) : (
                <div className={styles.chipGrid}>
                  {missingStickers.map((number) => (
                    <span key={number} className={`${styles.stickerChip} ${styles.missingChip}`}>#{number}</span>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>

        <div className={styles.overviewBlock}>
          <button
            className={styles.blockToggle}
            type="button"
            onClick={() => toggleList('duplicates')}
            aria-expanded={openLists.duplicates}
            aria-controls="duplicate-stickers-list"
          >
            <span className={styles.blockToggleText}>
              <strong>Doppelte</strong>
              <small>{duplicateStickers.length} verschiedene Sticker</small>
            </span>
            <span className={styles.blockToggleRight}>
              <span>{duplicateStickers.length}</span>
              <svg
                className={openLists.duplicates ? styles.chevronOpen : ''}
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <path d="m7 10 5 5 5-5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </button>
          {openLists.duplicates ? (
            <div id="duplicate-stickers-list">
              {duplicateStickers.length === 0 ? (
                <p className={styles.emptyText}>Du hast aktuell keine doppelten Sticker zum Tauschen.</p>
              ) : (
                <div className={styles.chipGrid}>
                  {duplicateStickers.map((sticker) => (
                    <span key={sticker.number} className={`${styles.stickerChip} ${styles.duplicateChip}`}>
                      #{sticker.number} <small>+{sticker.quantity}</small>
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </section>

      <div className={styles.gridSection}>
        <StickerGrid />
      </div>
    </div>
  )
}
