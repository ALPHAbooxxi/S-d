import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ALBUM_CONFIG } from '@/lib/album-config'
import { createClient } from '@/lib/supabase/server'
import styles from './public-profile.module.css'

async function loadPublicProfile(username) {
  const supabase = await createClient()

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, username, display_name, created_at')
    .ilike('username', username)
    .maybeSingle()

  if (profileError) {
    throw profileError
  }

  if (!profile) {
    return null
  }

  const { data: stickerRows, error: stickerError } = await supabase
    .from('user_stickers')
    .select('sticker_number, quantity')
    .eq('user_id', profile.id)
    .order('sticker_number', { ascending: true })

  if (stickerError) {
    throw stickerError
  }

  return {
    profile,
    stickerRows: stickerRows || [],
  }
}

export default async function PublicProfilePage({ params }) {
  const { username } = await params
  const data = await loadPublicProfile(username)

  if (!data) {
    notFound()
  }

  const { profile, stickerRows } = data
  const ownedCount = stickerRows.length
  const progress = Math.round((ownedCount / ALBUM_CONFIG.totalStickers) * 100)
  const totalDuplicates = stickerRows.reduce(
    (sum, entry) => sum + Math.max(0, entry.quantity - 1),
    0
  )
  const duplicateStickers = stickerRows.filter((entry) => entry.quantity > 1)
  const missingCount = ALBUM_CONFIG.totalStickers - ownedCount
  const heroName = profile.display_name || profile.username

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.badge}>Oeffentliches Profil</div>
        <div className={styles.avatar}>
          {heroName.charAt(0).toUpperCase()}
        </div>
        <h1 className={styles.title}>{heroName}</h1>
        <p className={styles.username}>@{profile.username}</p>
        <p className={styles.subtitle}>
          Albumstand und doppelte Sticker direkt aus der App geteilt.
        </p>
      </section>

      <section className={styles.progressCard}>
        <div className={styles.progressTop}>
          <div>
            <span className={styles.eyebrow}>Fortschritt</span>
            <h2>{ownedCount} von {ALBUM_CONFIG.totalStickers} Stickern</h2>
          </div>
          <strong className={styles.progressValue}>{progress}%</strong>
        </div>
        <div className={styles.progressTrack}>
          <div className={styles.progressBar} style={{ width: `${progress}%` }} />
        </div>
      </section>

      <section className={styles.statsGrid}>
        <article className={styles.statCard}>
          <strong>{ownedCount}</strong>
          <span>Im Album</span>
        </article>
        <article className={styles.statCard}>
          <strong>{missingCount}</strong>
          <span>Fehlen noch</span>
        </article>
        <article className={styles.statCard}>
          <strong>{totalDuplicates}</strong>
          <span>Doppelte Sticker</span>
        </article>
      </section>

      <section className={styles.duplicatesCard}>
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.eyebrow}>Tauschbereit</span>
            <h2>Doppelte Sticker</h2>
          </div>
          <span className={styles.sectionMeta}>
            {duplicateStickers.length} Nummern
          </span>
        </div>

        {duplicateStickers.length === 0 ? (
          <p className={styles.emptyState}>
            Aktuell sind keine doppelten Sticker eingetragen.
          </p>
        ) : (
          <div className={styles.chipGrid}>
            {duplicateStickers.map((entry) => (
              <div key={entry.sticker_number} className={styles.stickerChip}>
                <span>#{entry.sticker_number}</span>
                <strong>{entry.quantity - 1}x doppelt</strong>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className={styles.footerCard}>
        <p>
          Diese Ansicht ist öffentlich freigegeben, damit Profile einfach per Link oder QR-Code geteilt werden können.
        </p>
        <Link href="/" className={styles.footerLink}>
          Zur App
        </Link>
      </section>
    </main>
  )
}
