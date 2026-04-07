'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import BottomNav from '@/components/BottomNav'
import Providers from '@/components/Providers'
import styles from './app-layout.module.css'

function AppShell({ children }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className={styles.loadingScreen}>
        <div className="spinner" style={{ width: 40, height: 40, borderWidth: 4 }} />
      </div>
    )
  }

  if (!user) return null

  return (
    <div className={styles.appContainer}>
      <main className={styles.main}>
        {children}
      </main>
      <BottomNav />
    </div>
  )
}

export default function AppLayout({ children }) {
  return (
    <Providers>
      <AppShell>{children}</AppShell>
    </Providers>
  )
}
