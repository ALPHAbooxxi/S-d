# Supabase E-Mail-Templates

Diese Vorlagen sind fuer die Supabase-Auth-Mails im Look der SVD-Stickertausch-App gedacht.

Dateien:

- `confirm-sign-up.html`
- `invite-user.html`
- `magic-link.html`
- `change-email-address.html`
- `reset-password.html`
- `reauthentication.html`

Supabase-Platzhalter in den Templates:

- `{{ .ConfirmationURL }}`
- `{{ .Token }}`
- `{{ .Email }}`
- `{{ .NewEmail }}`
- `{{ .Data.display_name }}`

Einbinden:

1. Supabase Dashboard öffnen.
2. `Authentication` → `Email Templates`.
3. Jeweils den HTML-Inhalt der passenden Datei einfügen.

Empfohlene Betreffzeilen:

- Confirm sign up: `Bestaetige deine E-Mail fuer SVD Stickertausch`
- Invite user: `Deine Einladung zu SVD Stickertausch`
- Magic link: `Dein Login-Link fuer SVD Stickertausch`
- Change email address: `Bestaetige deine neue E-Mail-Adresse`
- Reset password: `Setze dein Passwort zurueck`
- Reauthentication: `Dein Sicherheitscode fuer SVD Stickertausch`
