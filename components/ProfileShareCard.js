'use client'

import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
import QRCode from 'qrcode'
import { ALBUM_CONFIG } from '@/lib/stickers-context'
import styles from './ProfileShareCard.module.css'

function buildShareText({ user, ownedCount, totalDuplicates, duplicateStickers }) {
  const topDuplicates = duplicateStickers
    .slice(0, 18)
    .map((entry) => `#${entry.number}`)
    .join(', ')

  return [
    'SVD Stickertausch',
    `@${user.username}`,
    user.displayName && user.displayName !== user.username ? user.displayName : null,
    `Albumstand: ${ownedCount}/${ALBUM_CONFIG.totalStickers} Sticker`,
    `Doppelte Sticker: ${totalDuplicates}`,
    topDuplicates
      ? `Aktuell zum Tauschen: ${topDuplicates}${duplicateStickers.length > 18 ? ' ...' : ''}`
      : 'Aktuell keine doppelten Sticker eingetragen.',
    `In der App finden unter: @${user.username}`,
  ]
    .filter(Boolean)
    .join('\n')
}

export default function ProfileShareCard({
  user,
  ownedCount,
  totalDuplicates,
  duplicateStickers,
}) {
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [copied, setCopied] = useState(false)

  const shareText = useMemo(
    () => buildShareText({ user, ownedCount, totalDuplicates, duplicateStickers }),
    [duplicateStickers, ownedCount, totalDuplicates, user]
  )

  useEffect(() => {
    let cancelled = false

    QRCode.toDataURL(shareText, {
      width: 280,
      margin: 1,
      color: {
        dark: '#111113',
        light: '#FFFFFFFF',
      },
    }).then((url) => {
      if (!cancelled) {
        setQrCodeUrl(url)
      }
    })

    return () => {
      cancelled = true
    }
  }, [shareText])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareText)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch (error) {
      setCopied(false)
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'SVD Stickertausch',
          text: shareText,
        })
        return
      } catch (error) {
        // User dismissed the system share sheet.
      }
    }

    await handleCopy()
  }

  return (
    <div className={styles.card}>
      <div className={styles.copy}>
        <div>
          <span className={styles.eyebrow}>Teilen per QR</span>
          <h3 className={styles.title}>Zeig deinen Tauschstand nach außen</h3>
        </div>
        <span className={styles.username}>@{user.username}</span>
      </div>

      <p className={styles.description}>
        Der Code zeigt deinen Benutzernamen, deinen Albumstand und deine aktuellen
        Tausch-Sticker. So finden dich andere direkt in der App.
      </p>

      <div className={styles.qrWrap}>
        {qrCodeUrl ? (
          <Image
            src={qrCodeUrl}
            alt={`QR-Code fuer ${user.username}`}
            className={styles.qrImage}
            width={260}
            height={260}
            unoptimized
          />
        ) : (
          <div className={styles.qrLoading}>
            <div className="spinner" />
          </div>
        )}
      </div>

      <div className={styles.stats}>
        <div className={styles.stat}>
          <strong>{ownedCount}</strong>
          <span>Sticker im Album</span>
        </div>
        <div className={styles.stat}>
          <strong>{totalDuplicates}</strong>
          <span>Doppelte Sticker</span>
        </div>
      </div>

      <div className={styles.actions}>
        <button className="btn btn-secondary btn-full" onClick={handleCopy}>
          {copied ? 'Text kopiert' : 'Text kopieren'}
        </button>
        <button className="btn btn-primary btn-full" onClick={handleShare}>
          Teilen
        </button>
      </div>
    </div>
  )
}
