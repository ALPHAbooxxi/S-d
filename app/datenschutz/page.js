import Link from 'next/link'
import styles from '../impressum/legal.module.css'

export const metadata = {
  title: 'Datenschutzerklärung – SVD Stickertausch',
  description: 'Datenschutzerklärung der SVD Stickertausch Plattform',
}

export default function DatenschutzPage() {
  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <Link href="/" className={styles.backLink}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
        </Link>
      </div>
      <div className={styles.content}>
        <h1>Datenschutzerklärung</h1>
        <p className={styles.lastUpdate}>Stand: April 2026</p>

        <h2>1. Verantwortlicher</h2>
        <p>
          Media Wilkens<br />
          Am Berghof 10<br />
          49744 Geeste<br />
          E-Mail: <a href="mailto:info@media-wilkens.de">info@media-wilkens.de</a><br />
          Telefon: <a href="tel:01752305295">0175 2305295</a>
        </p>

        <h2>2. Erhebung und Speicherung personenbezogener Daten</h2>
        <p>
          Bei der Nutzung der SVD Stickertausch Plattform werden folgende personenbezogene Daten erhoben:
        </p>
        <ul>
          <li><strong>Registrierung:</strong> Benutzername, E-Mail-Adresse, Passwort (verschlüsselt gespeichert)</li>
          <li><strong>Profil:</strong> Anzeigename und Benutzername fuer die Kommunikation in der App</li>
          <li><strong>Sammlung:</strong> Welche Sticker-Nummern Sie besitzen und deren Anzahl</li>
          <li><strong>Nachrichten:</strong> Nachrichten, die Sie über die Plattform mit anderen Nutzern austauschen</li>
          <li><strong>Tauschanfragen:</strong> Von Ihnen erstellte oder empfangene Anfragen innerhalb der App</li>
        </ul>

        <h2>3. Zweck der Datenverarbeitung</h2>
        <p>
          Ihre Daten werden ausschließlich für folgende Zwecke verwendet:
        </p>
        <ul>
          <li>Bereitstellung und Verwaltung Ihres Benutzerkontos</li>
          <li>Ermittlung passender Tauschpartner (Matching-Algorithmus)</li>
          <li>Kommunikation zwischen Nutzern über die Nachrichten-Funktion</li>
          <li>Anzeige und Verwaltung von Tauschanfragen innerhalb der App</li>
          <li>Versand von Push-Benachrichtigungen (nur mit Ihrer Zustimmung)</li>
        </ul>

        <h2>4. Rechtsgrundlagen</h2>
        <p>
          Die Verarbeitung Ihrer Daten erfolgt auf Grundlage von:
        </p>
        <ul>
          <li><strong>Art. 6 Abs. 1 lit. b DSGVO:</strong> Erfüllung eines Vertrages (Nutzung der Plattform)</li>
          <li><strong>Art. 6 Abs. 1 lit. a DSGVO:</strong> Einwilligung (Push-Benachrichtigungen)</li>
          <li><strong>Art. 6 Abs. 1 lit. f DSGVO:</strong> Berechtigtes Interesse (Sicherheit, Fehlerbehebung)</li>
        </ul>

        <h2>5. Hosting und Auftragsverarbeitung</h2>
        <p>
          Die Plattform wird auf folgenden Diensten gehostet:
        </p>
        <ul>
          <li><strong>Vercel Inc.</strong> (USA) – Webhosting und Bereitstellung der Webseite. Vercel ist unter dem EU-US Data Privacy Framework zertifiziert.</li>
          <li><strong>Supabase Inc.</strong> (USA) – Datenbank, Authentifizierung und Echtzeit-Kommunikation. Supabase speichert Daten auf Servern in der EU (Frankfurt, DE), sofern verfügbar.</li>
        </ul>
        <p>
          Mit beiden Anbietern bestehen Auftragsverarbeitungsverträge gemäß Art. 28 DSGVO.
        </p>

        <h2>6. Social Login (Google / Apple)</h2>
        <p>
          Wenn Sie sich über Google oder Apple anmelden, erhalten wir von diesen Anbietern
          Ihren Namen und Ihre E-Mail-Adresse. Weitere Daten werden nicht übermittelt.
          Die Datenschutzerklärungen der Anbieter finden Sie unter:
        </p>
        <ul>
          <li><a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Google Datenschutz</a></li>
          <li><a href="https://www.apple.com/legal/privacy/" target="_blank" rel="noopener noreferrer">Apple Datenschutz</a></li>
        </ul>

        <h2>7. Push-Benachrichtigungen</h2>
        <p>
          Mit Ihrer Zustimmung können Push-Benachrichtigungen an Ihr Gerät gesendet werden
          (z.B. bei neuen Nachrichten oder Tausch-Anfragen). Sie können diese Berechtigung
          jederzeit in Ihren Geräteeinstellungen oder in Ihrem Profil widerrufen.
        </p>

        <h2>8. Cookies und lokale Speicherung</h2>
        <p>
          Die Plattform verwendet:
        </p>
        <ul>
          <li><strong>Local Storage:</strong> Zur Speicherung Ihrer Sitzungsdaten und Sticker-Sammlung auf Ihrem Gerät</li>
          <li><strong>Session Cookies:</strong> Zur Authentifizierung (über Supabase Auth)</li>
        </ul>
        <p>
          Es werden keine Tracking-Cookies oder Analyse-Tools von Drittanbietern eingesetzt.
        </p>

        <h2>9. Ihre Rechte</h2>
        <p>
          Sie haben das Recht auf:
        </p>
        <ul>
          <li><strong>Auskunft</strong> über Ihre gespeicherten Daten (Art. 15 DSGVO)</li>
          <li><strong>Berichtigung</strong> unrichtiger Daten (Art. 16 DSGVO)</li>
          <li><strong>Löschung</strong> Ihrer Daten (Art. 17 DSGVO)</li>
          <li><strong>Einschränkung</strong> der Verarbeitung (Art. 18 DSGVO)</li>
          <li><strong>Datenübertragbarkeit</strong> (Art. 20 DSGVO)</li>
          <li><strong>Widerspruch</strong> gegen die Verarbeitung (Art. 21 DSGVO)</li>
        </ul>
        <p>
          Zur Ausübung Ihrer Rechte wenden Sie sich bitte an{' '}
          <a href="mailto:info@media-wilkens.de">info@media-wilkens.de</a>.
        </p>

        <h2>10. Löschung Ihres Kontos</h2>
        <p>
          Sie können Ihr Konto jederzeit über Ihr Profil oder per E-Mail an uns löschen lassen.
          Bei der Löschung werden alle Ihre personenbezogenen Daten, Ihre Sticker-Sammlung,
          Nachrichten und Tauschanfragen unwiderruflich entfernt.
        </p>

        <h2>11. Datensicherheit</h2>
        <p>
          Wir setzen technische und organisatorische Sicherheitsmaßnahmen ein, um Ihre
          Daten gegen Verlust, Zerstörung, Zugriff, Veränderung oder Verbreitung durch
          unbefugte Personen zu schützen. Insbesondere:
        </p>
        <ul>
          <li>Verschlüsselte Datenübertragung (HTTPS/TLS)</li>
          <li>Passwörter werden gehashed gespeichert (bcrypt)</li>
          <li>Row Level Security (RLS) in der Datenbank</li>
        </ul>

        <h2>12. Beschwerderecht</h2>
        <p>
          Sie haben das Recht, sich bei einer Datenschutz-Aufsichtsbehörde zu beschweren.
          Die zuständige Aufsichtsbehörde ist:
        </p>
        <p>
          Die Landesbeauftragte für den Datenschutz Niedersachsen<br />
          Prinzenstraße 5<br />
          30159 Hannover<br />
          <a href="https://www.lfd.niedersachsen.de" target="_blank" rel="noopener noreferrer">www.lfd.niedersachsen.de</a>
        </p>

        <h2>13. Änderungen</h2>
        <p>
          Wir behalten uns vor, diese Datenschutzerklärung bei Bedarf anzupassen,
          um sie an geänderte Rechtslagen oder Änderungen des Dienstes anzupassen.
          Die aktuelle Version finden Sie stets auf dieser Seite.
        </p>

        <div className={styles.footer}>
          <Link href="/">← Zurück zur Startseite</Link>
        </div>
      </div>
    </div>
  )
}
