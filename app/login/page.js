'use client'

import { Suspense, useState } from 'react'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import styles from './auth.module.css'

function LoginContent() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectError = searchParams.get('error')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login({ email, password })
      router.push('/sammlung')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <Link href="/" className={styles.backLink}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
          </svg>
        </Link>
      </div>

        <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.logo}>
            <div className={styles.logoCrop}>
              <Image
                src="/login_logo.png"
                alt="SVD Stickertausch"
                fill
                className={styles.logoImage}
                priority
              />
            </div>
          </div>
          <h1>Willkommen zurück!</h1>
          <p>Melde dich an, um deine Sammlung zu verwalten.</p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          {(error || redirectError) && <div className={styles.errorBox}>{error || redirectError}</div>}

          <div className="input-group">
            <label htmlFor="email">E-Mail</label>
            <input
              id="email"
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="deine@email.de"
              required
              autoComplete="email"
            />
          </div>

          <div className="input-group">
            <label htmlFor="password">Passwort</label>
            <input
              id="password"
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: -4 }}>
            <Link href="/passwort-vergessen" style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--svd-yellow-600)' }}>
              Passwort vergessen?
            </Link>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full btn-lg"
            disabled={loading}
            id="login-submit"
          >
            {loading ? <span className="spinner" /> : 'Anmelden'}
          </button>
        </form>

        <div className={styles.divider}>
          <span>oder</span>
        </div>

        <Link href="/register" className={`btn btn-secondary btn-full ${styles.switchLink}`} id="switch-to-register">
          Neuen Account erstellen
        </Link>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  )
}
