'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ChatIcon, CollectionIcon, SearchIcon, TrophyIcon } from '@/components/AppIcons'
import { createClient } from '@/lib/supabase/client'
import { ALBUM_CONFIG } from '@/lib/album-config'
import styles from './LandingPage.module.css'

export default function LandingPage() {
  const supabase = useMemo(() => createClient(), [])
  const [profileCount, setProfileCount] = useState(null)

  useEffect(() => {
    let active = true

    async function loadProfileCount() {
      try {
        const { count, error } = await supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })

        if (!active || error) return
        setProfileCount(count || 0)
      } catch {
        if (active) {
          setProfileCount(null)
        }
      }
    }

    void loadProfileCount()

    return () => {
      active = false
    }
  }, [supabase])

  return (
    <div className={styles.page}>
      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroBg} />
        <div className={styles.heroContent}>
          <Image
            src="/svdalum-6478683bad16e.png"
            alt="SV Dalum 1926 e.V."
            className={styles.heroLogo}
            width={100}
            height={100}
          />

          <div className={styles.badge100}>
            <span>100 JAHRE</span>
          </div>

          <h1 className={styles.heroTitle}>
            <span className={styles.titleSVD}>SVD</span>
            <span className={styles.titleSticker}>Stickertausch</span>
          </h1>
          
          <p className={styles.heroSub}>
            Die Tauschbörse für das Stickeralbum zum 100-jährigen Jubiläum des SV Dalum 1926 e.V.
          </p>
          
          <p className={styles.heroDesc}>
            708 Sticker · Tauschen · Nachrichten direkt in der App
          </p>

          <div className={styles.heroCta}>
            <Link href="/register" className="btn btn-primary btn-lg" id="cta-register">
              Jetzt loslegen
            </Link>
            <Link href="/login" className="btn btn-outline-yellow btn-lg" id="cta-login">
              Anmelden
            </Link>
          </div>
        </div>

        {/* Stats bar */}
        <div className={styles.statsBar}>
          <div className={styles.stat}>
            <span className={styles.statNum}>{profileCount ?? '...'}</span>
            <span className={styles.statLabel}>Sammler</span>
          </div>
          <div className={styles.statDiv} />
          <div className={styles.stat}>
            <span className={styles.statNum}>{ALBUM_CONFIG.totalStickers}</span>
            <span className={styles.statLabel}>Sticker</span>
          </div>
          <div className={styles.statDiv} />
          <div className={styles.stat}>
            <span className={styles.statNum}>{ALBUM_CONFIG.categories.length}</span>
            <span className={styles.statLabel}>Kategorien</span>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className={styles.howItWorks}>
        <h2>So funktioniert&apos;s</h2>
        <div className={styles.steps}>
          {[
            { icon: CollectionIcon, title: 'Sammlung pflegen', desc: 'Trage ein welche Sticker du hast und welche doppelt sind. Schnelleingabe macht\'s einfach!' },
            { icon: SearchIcon, title: 'Nutzer finden', desc: 'Suche direkt nach Benutzernamen oder lass dir passende Tauschpartner anzeigen.' },
            { icon: ChatIcon, title: 'In der App schreiben', desc: 'Starte Nachrichten und Tauschanfragen direkt in der App, ganz ohne WhatsApp oder E-Mail.' },
            { icon: TrophyIcon, title: 'Album vollmachen', desc: 'Behalte deinen Fortschritt im Blick und werde ein 100% Sammler!' },
          ].map((step, i) => (
            <div key={i} className={`${styles.stepCard} animate-fade-in-up delay-${i + 1}`}>
              <div className={styles.stepIcon}><step.icon size={26} strokeWidth={1.8} /></div>
              <h3>{step.title}</h3>
              <p>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className={styles.ctaSection}>
        <div className={styles.ctaCard}>
          <h2>Bereit?</h2>
          <p>Erstelle kostenlos deinen Account und starte mit dem Sammeln und Tauschen.</p>
          <Link href="/register" className="btn btn-primary btn-lg btn-full" id="cta-bottom">
            Kostenlos registrieren
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerLogo}>SVD Stickertausch</div>
          <p className={styles.footerText}>
            Ein Community-Projekt für den SV Dalum 1926 e.V.
          </p>
          <div className={styles.footerLinks}>
            <Link href="/impressum">Impressum</Link>
            <span className={styles.footerDot}>·</span>
            <Link href="/datenschutz">Datenschutz</Link>
          </div>
          <div className={styles.footerPowered}>
            powered by{' '}
            <a href="https://media-wilkens.de" target="_blank" rel="noopener noreferrer">
              Media Wilkens
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
