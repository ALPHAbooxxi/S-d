'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { BallIcon } from '@/components/AppIcons'
import { useAuth } from '@/lib/auth-context'
import { createClient } from '@/lib/supabase/client'
import styles from '@/app/login/auth.module.css'

function ResetPasswordContent() {
  const { updatePassword } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = useMemo(() => createClient(), [])
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let active = true

    async function prepareRecovery() {
      const code = searchParams.get('code')

      try {
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
          if (exchangeError) throw exchangeError
        } else {
          const { data } = await supabase.auth.getSession()
          if (!data.session) {
            setError('Der Reset-Link ist ungültig oder abgelaufen. Bitte fordere einen neuen Link an.')
          }
        }

        if (active) {
          setReady(true)
        }
      } catch (err) {
        if (active) {
          setError(err.message || 'Der Reset-Link ist ungültig oder abgelaufen.')
        }
      }
    }

    void prepareRecovery()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' && active) {
        setReady(true)
        setError('')
      }
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [searchParams, supabase])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (password.length < 6) {
      setError('Passwort muss mindestens 6 Zeichen lang sein.')
      return
    }

    if (password !== passwordConfirm) {
      setError('Passwörter stimmen nicht überein.')
      return
    }

    setLoading(true)

    try {
      await updatePassword({ password })
      setSuccess('Dein Passwort wurde erfolgreich aktualisiert. Du kannst dich jetzt anmelden.')
      window.setTimeout(() => router.push('/login'), 1200)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <Link href="/login" className={styles.backLink}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
          </svg>
        </Link>
      </div>

      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.logo}><BallIcon size={40} strokeWidth={1.8} /></div>
          <h1>Neues Passwort</h1>
          <p>Vergib jetzt ein neues Passwort fuer dein Konto.</p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          {error && <div className={styles.errorBox}>{error}</div>}
          {success && (
            <div style={{ padding: '12px 16px', background: 'var(--success-light)', borderRadius: 'var(--radius-md)', color: '#166534', fontSize: '0.82rem', fontWeight: 600 }}>
              {success}
            </div>
          )}

          {!ready && !error && (
            <div style={{ padding: '12px 16px', background: 'var(--gray-100)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', fontSize: '0.82rem', fontWeight: 600 }}>
              Reset-Link wird vorbereitet...
            </div>
          )}

          <div className="input-group">
            <label htmlFor="new-password">Neues Passwort</label>
            <input
              id="new-password"
              type="password"
              className="input"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Mindestens 6 Zeichen"
              required
              autoComplete="new-password"
              disabled={!ready || loading}
            />
          </div>

          <div className="input-group">
            <label htmlFor="confirm-new-password">Passwort bestätigen</label>
            <input
              id="confirm-new-password"
              type="password"
              className="input"
              value={passwordConfirm}
              onChange={(event) => setPasswordConfirm(event.target.value)}
              placeholder="Passwort wiederholen"
              required
              autoComplete="new-password"
              disabled={!ready || loading}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full btn-lg"
            disabled={!ready || loading}
          >
            {loading ? <span className="spinner" /> : 'Passwort speichern'}
          </button>
        </form>

        <div className={styles.divider}>
          <span>oder</span>
        </div>

        <Link href="/passwort-vergessen" className={`btn btn-secondary btn-full ${styles.switchLink}`}>
          Neuen Reset-Link anfordern
        </Link>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className={styles.page}>
        <div className={styles.container} style={{ justifyContent: 'center', paddingTop: 80 }}>
          <div className={styles.header}>
            <div className={styles.logo}><BallIcon size={40} strokeWidth={1.8} /></div>
            <h1>Neues Passwort</h1>
            <p>Reset-Link wird vorbereitet...</p>
          </div>
        </div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  )
}
