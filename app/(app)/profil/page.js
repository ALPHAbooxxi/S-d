'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { useStickers, ALBUM_CONFIG } from '@/lib/stickers-context'
import { usePushNotifications } from '@/lib/use-push-notifications'
import { BellIcon, CheckIcon } from '@/components/AppIcons'
import ProgressRing from '@/components/ProgressRing'
import ProfileShareCard from '@/components/ProfileShareCard'
import styles from './profil.module.css'

export default function ProfilPage() {
  const { user, logout, updateProfile } = useAuth()
  const { ownedStickers, duplicateStickers, progress, totalDuplicates, clearAll } = useStickers()
  const { supported: pushSupported, permission: pushPermission, requestPermission } = usePushNotifications()
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    displayName: user?.displayName || '',
  })
  const [showConfirmClear, setShowConfirmClear] = useState(false)

  const handleSave = () => {
    updateProfile(form)
    setEditing(false)
  }

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  const handleClearAll = () => {
    clearAll()
    setShowConfirmClear(false)
  }

  const handlePushToggle = async () => {
    if (pushPermission !== 'granted') {
      await requestPermission()
    }
  }

  return (
    <div className={styles.page}>
      {/* Profile Header */}
      <div className={styles.profileHeader}>
        <div className={styles.avatarLarge}>
          {(user?.displayName || user?.username)?.charAt(0).toUpperCase()}
        </div>
        <h1 className={styles.profileName}>{user?.displayName || user?.username}</h1>
        <span className={styles.profileUsername}>@{user?.username}</span>
        <span className={styles.profileDate}>
          Dabei seit {new Date(user?.createdAt).toLocaleDateString('de-DE', {
            month: 'long', year: 'numeric'
          })}
        </span>
      </div>

      {/* Stats */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <ProgressRing progress={progress} size={72} strokeWidth={7} />
        </div>
        <div className={styles.statCard}>
          <span className={styles.statBig}>{ownedStickers.length}</span>
          <span className={styles.statSmall}>von {ALBUM_CONFIG.totalStickers}</span>
          <span className={styles.statLabel}>Sticker</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statBig}>{totalDuplicates}</span>
          <span className={styles.statSmall}>{duplicateStickers.length} versch.</span>
          <span className={styles.statLabel}>Doppelte</span>
        </div>
      </div>

      {/* Profile Settings */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Profil</h2>
          {!editing ? (
            <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)} id="edit-profile">Bearbeiten</button>
          ) : (
            <button className="btn btn-primary btn-sm" onClick={handleSave} id="save-profile">Speichern</button>
          )}
        </div>

        {editing ? (
          <div className={styles.editForm}>
            <div className="input-group">
              <label htmlFor="edit-name">Anzeigename</label>
              <input id="edit-name" type="text" className="input" value={form.displayName} onChange={(e) => setForm(prev => ({ ...prev, displayName: e.target.value }))} />
            </div>
          </div>
        ) : (
          <div className={styles.profileInfo}>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>E-Mail</span>
              <span className={styles.infoValue}>{user?.email}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Benutzername</span>
              <span className={styles.infoValue}>@{user?.username}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Kommunikation</span>
              <span className={styles.infoValue}>Nur ueber Nachrichten und Tauschanfragen in der App</span>
            </div>
          </div>
        )}
      </div>

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Teilen</h2>
        </div>
        <ProfileShareCard
          user={user}
          ownedCount={ownedStickers.length}
          totalDuplicates={totalDuplicates}
          duplicateStickers={duplicateStickers}
        />
      </div>

      {/* Push Notifications */}
      {pushSupported && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Benachrichtigungen</h2>
          </div>
          <div className={styles.pushRow}>
            <div className={styles.pushInfo}>
              <span className={styles.pushIcon}><BellIcon size={18} strokeWidth={1.8} /></span>
              <div>
                <span className={styles.pushLabel}>Push-Benachrichtigungen</span>
                <span className={styles.pushDesc}>
                  {pushPermission === 'granted'
                    ? 'Aktiv – du wirst benachrichtigt bei neuen Nachrichten'
                    : pushPermission === 'denied'
                    ? 'Blockiert – aktiviere sie in deinen Browser-Einstellungen'
                    : 'Erhalte Benachrichtigungen bei neuen Nachrichten und Tauschanfragen'
                  }
                </span>
              </div>
            </div>
            {pushPermission !== 'granted' && pushPermission !== 'denied' && (
              <button className="btn btn-primary btn-sm" onClick={handlePushToggle} id="enable-push">
                Aktivieren
              </button>
            )}
            {pushPermission === 'granted' && (
              <span className={styles.pushActive}><CheckIcon size={14} strokeWidth={2.2} />Aktiv</span>
            )}
            {pushPermission === 'denied' && (
              <span className={styles.pushDenied}>Blockiert</span>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Aktionen</h2>
        <div className={styles.actionList}>
          <button className={`${styles.actionBtn} ${styles.actionWarn}`} onClick={() => setShowConfirmClear(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
            Alle Sticker zurücksetzen
          </button>
          <button className={`${styles.actionBtn} ${styles.actionDanger}`} onClick={handleLogout} id="logout-button">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
            Abmelden
          </button>
        </div>
      </div>

      {/* Legal Links */}
      <div className={styles.legalLinks}>
        <Link href="/impressum">Impressum</Link>
        <span>·</span>
        <Link href="/datenschutz">Datenschutz</Link>
      </div>

      {/* Powered By */}
      <div className={styles.poweredBy}>
        powered by{' '}
        <a href="https://media-wilkens.de" target="_blank" rel="noopener noreferrer">Media Wilkens</a>
      </div>

      {/* Confirm Clear Modal */}
      {showConfirmClear && (
        <div className="modal-overlay" onClick={() => setShowConfirmClear(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-handle" />
            <h3 style={{ marginBottom: 8 }}>Sticker zurücksetzen?</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: 20, lineHeight: 1.5 }}>
              Dies löscht alle eingetragenen Sticker unwiderruflich. Bist du sicher?
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary btn-full" onClick={() => setShowConfirmClear(false)}>Abbrechen</button>
              <button className="btn btn-full" style={{ background: 'var(--error)', color: 'white' }} onClick={handleClearAll}>Ja, zurücksetzen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
