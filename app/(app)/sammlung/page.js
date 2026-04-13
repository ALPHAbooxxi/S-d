'use client'

import StickerGrid from '@/components/StickerGrid'
import styles from './sammlung.module.css'

export default function SammlungPage() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Sammlung</h1>
        <p className={styles.copy}>
          Hier bearbeitest du nur deine aktuelle Sammlung. Füge Sticker hinzu, erhöhe doppelte Exemplare oder entferne vorhandene Einträge wieder.
        </p>
      </div>

      <div className={styles.gridSection}>
        <StickerGrid />
      </div>
    </div>
  )
}
