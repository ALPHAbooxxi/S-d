'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import BottomNav from '@/components/BottomNav'
import AppOnboardingPrompt from '@/components/AppOnboardingPrompt'
import Providers from '@/components/Providers'
import styles from './app-layout.module.css'

function AppShell({ children }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const isPresentationRoute = pathname?.startsWith('/liveinfo')

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
      {isPresentationRoute ? null : <BottomNav />}
      <AppOnboardingPrompt />
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
