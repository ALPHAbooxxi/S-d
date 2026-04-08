'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { usePushNotifications } from '@/lib/use-push-notifications'
import styles from './AppOnboardingPrompt.module.css'

const STORAGE_KEY = 'svd_onboarding_prompt_seen_v1'

function isStandaloneMode() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  )
}

export default function AppOnboardingPrompt() {
  const { user } = useAuth()
  const { supported, permission, requestPermission } = usePushNotifications()
  const [open, setOpen] = useState(() => (
    typeof window !== 'undefined' && !localStorage.getItem(STORAGE_KEY)
  ))
  const [installPrompt, setInstallPrompt] = useState(null)
  const [installState, setInstallState] = useState(() => (
    typeof window === 'undefined'
      ? { standalone: false, ios: false }
      : {
          standalone: isStandaloneMode(),
          ios: /iphone|ipad|ipod/i.test(window.navigator.userAgent),
        }
  ))

  useEffect(() => {
    if (!user) return

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault()
      setInstallPrompt(event)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [user])

  const closePrompt = () => {
    localStorage.setItem(STORAGE_KEY, '1')
    setOpen(false)
  }

  const handleInstall = async () => {
    if (!installPrompt) return

    await installPrompt.prompt()
    const choice = await installPrompt.userChoice

    if (choice?.outcome === 'accepted') {
      setInstallState((current) => ({ ...current, standalone: true }))
    }

    setInstallPrompt(null)
  }

  const installDescription = installState.standalone
    ? 'Die App ist bereits auf dem Homebildschirm installiert.'
    : installPrompt
    ? 'Installiere die App direkt im Browser, damit sie sich wie eine echte App öffnet.'
    : installState.ios
    ? 'Tippe in Safari auf Teilen und dann auf "Zum Home-Bildschirm", damit du die App schnell wiederfindest.'
    : 'Fuege die App ueber das Browser-Menue deinem Homebildschirm hinzu, damit sie immer direkt griffbereit ist.'

  if (!open || !user) return null

  return (
    <div className="modal-overlay" onClick={closePrompt}>
      <div className="modal-content" onClick={(event) => event.stopPropagation()}>
        <div className="modal-handle" />

        <div className={styles.hero}>
          <span className={styles.eyebrow}>Schnellstart</span>
          <h2 className={styles.title}>Mach die App startklar</h2>
          <p className={styles.subtitle}>
            Füg sie auf deinem Homebildschirm hinzu und aktiviere Benachrichtigungen,
            damit Tauschanfragen und Nachrichten direkt ankommen.
          </p>
        </div>

        <div className={styles.checklist}>
          <div className={styles.item}>
            <div className={styles.itemCopy}>
              <span className={styles.itemTitle}>Zum Homebildschirm</span>
              <span className={styles.itemText}>{installDescription}</span>
            </div>
            {installState.standalone ? (
              <span className={styles.done}>Aktiv</span>
            ) : installPrompt ? (
              <button className="btn btn-secondary btn-sm" onClick={handleInstall}>
                Hinzufuegen
              </button>
            ) : (
              <span className={styles.hint}>Hinweis</span>
            )}
          </div>

          <div className={styles.item}>
            <div className={styles.itemCopy}>
              <span className={styles.itemTitle}>Benachrichtigungen</span>
              <span className={styles.itemText}>
                {permission === 'granted'
                  ? 'Push-Benachrichtigungen sind bereits aktiv.'
                  : permission === 'denied'
                  ? 'Benachrichtigungen sind blockiert. Du kannst sie spaeter in den Browser-Einstellungen wieder freigeben.'
                  : supported
                  ? 'Aktiviere Push, damit du neue Nachrichten und Tauschanfragen nicht verpasst.'
                  : 'Dein Browser unterstuetzt hier leider keine Push-Benachrichtigungen.'}
              </span>
            </div>
            {permission === 'granted' ? (
              <span className={styles.done}>Aktiv</span>
            ) : permission === 'default' && supported ? (
              <button className="btn btn-primary btn-sm" onClick={requestPermission}>
                Aktivieren
              </button>
            ) : (
              <span className={styles.hint}>{supported ? 'Spaeter' : 'Nicht verfuegbar'}</span>
            )}
          </div>
        </div>

        <div className={styles.footer}>
          <button className="btn btn-ghost btn-full" onClick={closePrompt}>
            Weiter zur App
          </button>
        </div>
      </div>
    </div>
  )
}
