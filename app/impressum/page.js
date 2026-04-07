import Link from 'next/link'
import styles from './legal.module.css'

export const metadata = {
  title: 'Impressum – SVD Stickertausch',
  description: 'Impressum der SVD Stickertausch Plattform',
}

export default function ImpressumPage() {
  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <Link href="/" className={styles.backLink}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
        </Link>
      </div>
      <div className={styles.content}>
        <h1>Impressum</h1>

        <h2>Angaben gemäß § 5 TMG</h2>
        <p>
          Media Wilkens<br />
          Am Berghof 10<br />
          49744 Geeste
        </p>

        <h2>Kontakt</h2>
        <p>
          Telefon: <a href="tel:01752305295">0175 2305295</a><br />
          E-Mail: <a href="mailto:info@media-wilkens.de">info@media-wilkens.de</a>
        </p>

        <h2>Umsatzsteuer</h2>
        <p>
          Gemäß § 19 UStG wird keine Umsatzsteuer berechnet (Kleinunternehmerregelung).
        </p>

        <h2>Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</h2>
        <p>
          Media Wilkens<br />
          Am Berghof 10<br />
          49744 Geeste
        </p>

        <h2>EU-Streitschlichtung</h2>
        <p>
          Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit: <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer">https://ec.europa.eu/consumers/odr/</a>.
          Unsere E-Mail-Adresse finden Sie oben im Impressum.
        </p>

        <h2>Verbraucherstreitbeilegung / Universalschlichtungsstelle</h2>
        <p>
          Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
        </p>

        <h2>Haftung für Inhalte</h2>
        <p>
          Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich.
          Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen
          oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen. Verpflichtungen zur Entfernung oder Sperrung der Nutzung
          von Informationen nach den allgemeinen Gesetzen bleiben hiervon unberührt.
        </p>

        <h2>Haftung für Links</h2>
        <p>
          Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben.
          Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der verlinkten
          Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich.
        </p>

        <h2>Urheberrecht</h2>
        <p>
          Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen Urheberrecht.
          Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechtes
          bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers.
        </p>

        <div className={styles.footer}>
          <Link href="/">← Zurück zur Startseite</Link>
        </div>
      </div>
    </div>
  )
}
