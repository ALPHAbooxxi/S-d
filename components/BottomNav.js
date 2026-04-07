'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTrades } from '@/lib/trades-context'
import styles from './BottomNav.module.css'

const navItems = [
  {
    href: '/sammlung',
    label: 'Sammlung',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--svd-yellow-500)' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    href: '/tauschboerse',
    label: 'Tauschbörse',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--svd-yellow-500)' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 16l-4-4 4-4" />
        <path d="M17 8l4 4-4 4" />
        <path d="M3 12h18" />
      </svg>
    ),
  },
  {
    href: '/nachrichten',
    label: 'Nachrichten',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--svd-yellow-500)' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    href: '/profil',
    label: 'Profil',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--svd-yellow-500)' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
]

export default function BottomNav() {
  const pathname = usePathname()
  const { unreadCount } = useTrades()

  return (
    <nav className={styles.nav} id="bottom-navigation">
      {navItems.map(item => {
        const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
        return (
          <Link key={item.href} href={item.href} className={`${styles.item} ${isActive ? styles.active : ''}`}>
            <span className={styles.iconWrap}>
              {item.icon(isActive)}
              {item.href === '/nachrichten' && unreadCount > 0 && (
                <span className={styles.badge}>{unreadCount > 9 ? '9+' : unreadCount}</span>
              )}
              {isActive && <span className={styles.activeIndicator} />}
            </span>
            <span className={styles.label}>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
