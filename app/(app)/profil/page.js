'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { useStickers, ALBUM_CONFIG } from '@/lib/stickers-context'
import { usePushNotifications } from '@/lib/use-push-notifications'
import { BellIcon, CheckIcon } from '@/components/AppIcons'
import AlbumOverview from '@/components/AlbumOverview'
import ProgressRing from '@/components/ProgressRing'
import ProfileShareCard from '@/components/ProfileShareCard'
import styles from './profil.module.css'

export default function ProfilPage() {
  const { user, logout, updateProfile, updateEmail, updatePassword, deleteAccount } = useAuth()
  const { ownedStickers, duplicateStickers, progress, totalDuplicates, clearAll } = useStickers()
  const {
    supported: pushSupported,
    permission: pushPermission,
    subscription: pushSubscription,
    busy: pushBusy,
    error: pushError,
    requestPermission,
    disablePush,
    sendTestPush,
  } = usePushNotifications()
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    displayName: user?.displayName || '',
  })
  const [emailForm, setEmailForm] = useState({
    email: user?.email || '',
  })
  const [passwordForm, setPasswordForm] = useState({
    password: '',
    confirmPassword: '',
  })
  const [showConfirmClear, setShowConfirmClear] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [feedback, setFeedback] = useState({ type: '', message: '' })
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingEmail, setSavingEmail] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    setForm({ displayName: user?.displayName || '' })
    setEmailForm({ email: user?.email || '' })
  }, [user?.displayName, user?.email])

  const handleSave = async () => {
    setFeedback({ type: '', message: '' })
    setSavingProfile(true)
    try {
      await updateProfile(form)
      setEditing(false)
      setFeedback({ type: 'success', message: 'Anzeigename wurde aktualisiert.' })
    } catch (error) {
      setFeedback({ type: 'error', message: error.message })
    } finally {
      setSavingProfile(false)
    }
  }

  const handleLogout = async () => {
    await logout()
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

  const handlePushDisable = async () => {
    await disablePush()
  }

  const handlePushTest = async () => {
    await sendTestPush()
  }

  const handleEmailSave = async () => {
    setFeedback({ type: '', message: '' })

    const normalizedEmail = emailForm.email.trim()
    if (!normalizedEmail) {
      setFeedback({ type: 'error', message: 'Bitte eine gueltige E-Mail eingeben.' })
      return
    }

    setSavingEmail(true)
    try {
      await updateEmail({ email: normalizedEmail })
      setFeedback({
        type: 'success',
        message: 'Bestaetige jetzt die Mail an deine neue Adresse. Die Aenderung wird danach uebernommen.',
      })
    } catch (error) {
      setFeedback({ type: 'error', message: error.message })
    } finally {
      setSavingEmail(false)
    }
  }

  const handlePasswordSave = async () => {
    setFeedback({ type: '', message: '' })

    if (passwordForm.password.length < 6) {
      setFeedback({ type: 'error', message: 'Das neue Passwort muss mindestens 6 Zeichen lang sein.' })
      return
    }

    if (passwordForm.password !== passwordForm.confirmPassword) {
      setFeedback({ type: 'error', message: 'Die neuen Passwoerter stimmen nicht ueberein.' })
      return
    }

    setSavingPassword(true)
    try {
      await updatePassword({ password: passwordForm.password })
      setPasswordForm({ password: '', confirmPassword: '' })
      setFeedback({ type: 'success', message: 'Passwort wurde aktualisiert.' })
    } catch (error) {
      setFeedback({ type: 'error', message: error.message })
    } finally {
      setSavingPassword(false)
    }
  }

  const handleDeleteAccount = async () => {
    setFeedback({ type: '', message: '' })
    setDeletingAccount(true)
    try {
      await deleteAccount()
      router.push('/')
    } catch (error) {
      setFeedback({ type: 'error', message: error.message })
      setShowDeleteModal(false)
    } finally {
      setDeletingAccount(false)
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

      <div className={styles.albumOverviewWrap}>
        <AlbumOverview />
      </div>

      {/* Profile Settings */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Profil</h2>
          {!editing ? (
            <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)} id="edit-profile">Bearbeiten</button>
          ) : (
            <button className="btn btn-primary btn-sm" onClick={handleSave} id="save-profile" disabled={savingProfile}>
              {savingProfile ? 'Speichert...' : 'Speichern'}
            </button>
          )}
        </div>

        {feedback.message && (
          <div className={feedback.type === 'error' ? styles.feedbackError : styles.feedbackSuccess}>
            {feedback.message}
          </div>
        )}

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
          </div>
        )}
      </div>

      <div className={styles.section}>
        <button
          className={styles.accordionToggle}
          type="button"
          onClick={() => setSettingsOpen((open) => !open)}
          aria-expanded={settingsOpen}
        >
          <div>
            <h2 className={styles.sectionTitle}>Einstellungen</h2>
            <p className={styles.accordionText}>
              E-Mail, Passwort und Account-Verwaltung
            </p>
          </div>
          <span className={`${styles.accordionIcon} ${settingsOpen ? styles.accordionIconOpen : ''}`}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </span>
        </button>

        {settingsOpen && (
          <div className={styles.accordionContent}>
            {feedback.message && (
              <div className={feedback.type === 'error' ? styles.feedbackError : styles.feedbackSuccess}>
                {feedback.message}
              </div>
            )}

            <div className={styles.editForm}>
              <div className="input-group">
                <label htmlFor="edit-email">E-Mail aendern</label>
                <input
                  id="edit-email"
                  type="email"
                  className="input"
                  value={emailForm.email}
                  onChange={(event) => setEmailForm({ email: event.target.value })}
                  autoComplete="email"
                />
              </div>
              <button className="btn btn-secondary" onClick={handleEmailSave} disabled={savingEmail}>
                {savingEmail ? 'Wird gesendet...' : 'E-Mail aktualisieren'}
              </button>

              <div className={styles.separator} />

              <div className="input-group">
                <label htmlFor="new-password-profile">Neues Passwort</label>
                <input
                  id="new-password-profile"
                  type="password"
                  className="input"
                  value={passwordForm.password}
                  onChange={(event) => setPasswordForm((prev) => ({ ...prev, password: event.target.value }))}
                  autoComplete="new-password"
                />
              </div>
              <div className="input-group">
                <label htmlFor="confirm-password-profile">Passwort bestaetigen</label>
                <input
                  id="confirm-password-profile"
                  type="password"
                  className="input"
                  value={passwordForm.confirmPassword}
                  onChange={(event) => setPasswordForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
                  autoComplete="new-password"
                />
              </div>
              <button className="btn btn-secondary" onClick={handlePasswordSave} disabled={savingPassword}>
                {savingPassword ? 'Speichert...' : 'Passwort aktualisieren'}
              </button>

              <div className={styles.separator} />

              <div className={styles.actionList}>
                <button className={`${styles.actionBtn} ${styles.actionWarn}`} onClick={() => setShowConfirmClear(true)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                  Alle Sticker zurücksetzen
                </button>
                <button className={`${styles.actionBtn} ${styles.actionDanger}`} onClick={handleLogout} id="logout-button">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                  Abmelden
                </button>
                <button className={`${styles.actionBtn} ${styles.actionDangerStrong}`} onClick={() => setShowDeleteModal(true)} id="delete-account-button">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /></svg>
                  Account loeschen
                </button>
              </div>
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
                    ? pushSubscription
                      ? 'Aktiv – neue Nachrichten und Tauschanfragen koennen dich jetzt erreichen'
                      : 'Erlaubt – die Push-Subscription wird gerade vorbereitet'
                    : pushPermission === 'denied'
                    ? 'Blockiert – aktiviere sie in deinen Browser-Einstellungen'
                    : 'Erhalte Benachrichtigungen bei neuen Nachrichten und Tauschanfragen'
                  }
                </span>
              </div>
            </div>
            {pushPermission !== 'granted' && pushPermission !== 'denied' && (
              <button className="btn btn-primary btn-sm" onClick={handlePushToggle} id="enable-push" disabled={pushBusy}>
                {pushBusy ? 'Aktiviert...' : 'Aktivieren'}
              </button>
            )}
            {pushPermission === 'granted' && (
              <div className={styles.pushActions}>
                <span className={styles.pushActive}><CheckIcon size={14} strokeWidth={2.2} />Aktiv</span>
                <button className="btn btn-secondary btn-sm" onClick={handlePushTest} disabled={pushBusy || !pushSubscription}>
                  Test senden
                </button>
                <button className="btn btn-ghost btn-sm" onClick={handlePushDisable} disabled={pushBusy || !pushSubscription}>
                  Deaktivieren
                </button>
              </div>
            )}
            {pushPermission === 'denied' && (
              <span className={styles.pushDenied}>Blockiert</span>
            )}
          </div>
          {pushError ? (
            <div className={styles.feedbackError} style={{ marginTop: 16, marginBottom: 0 }}>
              {pushError}
            </div>
          ) : null}
        </div>
      )}

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

      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-handle" />
            <h3 style={{ marginBottom: 8 }}>Account loeschen?</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: 20, lineHeight: 1.5 }}>
              Dein Profil, deine Stickerdaten und dein Login werden endgueltig geloescht. Dieser Schritt kann nicht rueckgaengig gemacht werden.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary btn-full" onClick={() => setShowDeleteModal(false)} disabled={deletingAccount}>Abbrechen</button>
              <button className="btn btn-full" style={{ background: 'var(--error)', color: 'white' }} onClick={handleDeleteAccount} disabled={deletingAccount}>
                {deletingAccount ? 'Loescht...' : 'Ja, Account loeschen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
