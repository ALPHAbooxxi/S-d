'use client'

import { useState } from 'react'
import Link from 'next/link'
import { BallIcon } from '@/components/AppIcons'
import { useAuth } from '@/lib/auth-context'
import styles from '@/app/login/auth.module.css'

export default function ForgotPasswordPage() {
  const { requestPasswordReset } = useAuth()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      await requestPasswordReset(email)
      setSuccess(`Wenn ein Konto fuer ${email} existiert, wurde dir ein Link zum Zuruecksetzen geschickt.`)
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
          <h1>Passwort vergessen?</h1>
          <p>Wir schicken dir einen Link, mit dem du dein Passwort neu setzen kannst.</p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          {error && <div className={styles.errorBox}>{error}</div>}
          {success && (
            <div style={{ padding: '12px 16px', background: 'var(--success-light)', borderRadius: 'var(--radius-md)', color: '#166534', fontSize: '0.82rem', fontWeight: 600 }}>
              {success}
            </div>
          )}

          <div className="input-group">
            <label htmlFor="forgot-email">E-Mail</label>
            <input
              id="forgot-email"
              type="email"
              className="input"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="deine@email.de"
              required
              autoComplete="email"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full btn-lg"
            disabled={loading}
          >
            {loading ? <span className="spinner" /> : 'Reset-Link senden'}
          </button>
        </form>

        <div className={styles.divider}>
          <span>oder</span>
        </div>

        <Link href="/login" className={`btn btn-secondary btn-full ${styles.switchLink}`}>
          Zurueck zum Login
        </Link>
      </div>
    </div>
  )
}
