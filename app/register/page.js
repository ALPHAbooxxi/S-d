'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import styles from '../login/auth.module.css'

export default function RegisterPage() {
  const [form, setForm] = useState({
    username: '',
    displayName: '',
    email: '',
    password: '',
    passwordConfirm: '',
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const router = useRouter()

  const handleChange = (field) => (e) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (form.password.length < 6) {
      setError('Passwort muss mindestens 6 Zeichen lang sein.')
      return
    }

    if (form.password !== form.passwordConfirm) {
      setError('Passwörter stimmen nicht überein.')
      return
    }

    if (form.username.length < 3) {
      setError('Benutzername muss mindestens 3 Zeichen lang sein.')
      return
    }

    setLoading(true)
    try {
      const result = await register({
        username: form.username,
        displayName: form.displayName || form.username,
        email: form.email,
        password: form.password,
      })
      if (result?.pendingEmailConfirmation) {
        setSuccess(`Account angelegt. Bitte bestätige jetzt die E-Mail an ${result.email} und melde dich danach an.`)
        return
      }
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
          <h1>Account erstellen</h1>
          <p>Registriere dich kostenlos und tausche danach nur direkt in der App.</p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          {error && <div className={styles.errorBox}>{error}</div>}
          {success && <div style={{ padding: '12px 16px', background: 'var(--success-light)', borderRadius: 'var(--radius-md)', color: '#166534', fontSize: '0.82rem', fontWeight: 600 }}>{success}</div>}

          <div className="input-group">
            <label htmlFor="username">Benutzername *</label>
            <input
              id="username"
              type="text"
              className="input"
              value={form.username}
              onChange={handleChange('username')}
              placeholder="z.B. MaxMustermann"
              required
              autoComplete="username"
            />
          </div>

          <div className="input-group">
            <label htmlFor="displayName">Anzeigename</label>
            <input
              id="displayName"
              type="text"
              className="input"
              value={form.displayName}
              onChange={handleChange('displayName')}
              placeholder="z.B. Max M."
              autoComplete="name"
            />
          </div>

          <div className="input-group">
            <label htmlFor="reg-email">E-Mail *</label>
            <input
              id="reg-email"
              type="email"
              className="input"
              value={form.email}
              onChange={handleChange('email')}
              placeholder="deine@email.de"
              required
              autoComplete="email"
            />
          </div>

          <div className="input-group">
            <label htmlFor="reg-password">Passwort *</label>
            <input
              id="reg-password"
              type="password"
              className="input"
              value={form.password}
              onChange={handleChange('password')}
              placeholder="Mindestens 6 Zeichen"
              required
              autoComplete="new-password"
            />
          </div>

          <div className="input-group">
            <label htmlFor="reg-password-confirm">Passwort bestätigen *</label>
            <input
              id="reg-password-confirm"
              type="password"
              className="input"
              value={form.passwordConfirm}
              onChange={handleChange('passwordConfirm')}
              placeholder="Passwort wiederholen"
              required
              autoComplete="new-password"
            />
          </div>

          <div className={styles.separator} />

          <button
            type="submit"
            className="btn btn-primary btn-full btn-lg"
            disabled={loading}
            id="register-submit"
          >
            {loading ? <span className="spinner" /> : 'Registrieren'}
          </button>
        </form>

        <div className={styles.divider}>
          <span>oder</span>
        </div>

        <Link href="/login" className={`btn btn-ghost btn-full ${styles.switchLink}`} id="switch-to-login">
          Bereits registriert? Anmelden
        </Link>
      </div>
    </div>
  )
}
