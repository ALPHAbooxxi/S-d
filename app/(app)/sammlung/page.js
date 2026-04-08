'use client'

import { useAuth } from '@/lib/auth-context'
import { useStickers, ALBUM_CONFIG } from '@/lib/stickers-context'
import { SparkIcon } from '@/components/AppIcons'
import AlbumOverview from '@/components/AlbumOverview'
import ProgressRing from '@/components/ProgressRing'
import StickerGrid from '@/components/StickerGrid'
import styles from './sammlung.module.css'

export default function SammlungPage() {
  const { user } = useAuth()
  const { ownedStickers, duplicateStickers, missingStickers, progress, totalDuplicates } = useStickers()

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <h1 className={styles.title}>Meine Sammlung</h1>
          <span className={styles.greeting}>Hallo, {user?.displayName || user?.username}!</span>
        </div>
      </div>

      <div className={styles.statsSection}>
        <div className={styles.progressCard}>
          <ProgressRing progress={progress} size={100} strokeWidth={9} label="komplett" />
          <div className={styles.progressDetails}>
            <div className={styles.statRow}>
              <span className={styles.statDot} style={{ background: 'var(--svd-yellow-500)' }} />
              <span className={styles.statText}><strong>{ownedStickers.length}</strong> von {ALBUM_CONFIG.totalStickers} Stickern</span>
            </div>
            <div className={styles.statRow}>
              <span className={styles.statDot} style={{ background: 'var(--svd-dark-700)' }} />
              <span className={styles.statText}><strong>{totalDuplicates}</strong> doppelte Sticker</span>
            </div>
            <div className={styles.statRow}>
              <span className={styles.statDot} style={{ background: 'var(--gray-300)' }} />
              <span className={styles.statText}><strong>{missingStickers.length}</strong> fehlen noch</span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.overviewSection}>
        <AlbumOverview />
      </div>

      <div className={styles.gridSection}>
        <StickerGrid />
      </div>

      {duplicateStickers.length > 0 && (
        <div className={styles.duplicatesHint}>
          <div className={styles.duplicatesIcon}><SparkIcon size={20} strokeWidth={1.8} /></div>
          <div>
            <strong>Tipp:</strong> Du hast {totalDuplicates} doppelte Sticker. 
            Geh zur Tauschboerse, um passende Nutzer zu finden und direkt in der App eine Tauschanfrage zu senden.
          </div>
        </div>
      )}
    </div>
  )
}
