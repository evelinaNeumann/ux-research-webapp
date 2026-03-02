# Go-To Plan (Deployment) fuer eure private Web-App

## Zielbild
- Private, stabile Bereitstellung fuer max. ca. 20 gleichzeitige Nutzer.
- Fokus auf einfache Wartung, Datensicherheit, Backup und schnelle Wiederherstellung.

## 1. Ziel-Setup (empfohlen)
- **1 VM/Server** (z. B. Hetzner, IONOS, Netcup, DigitalOcean) mit:
  - 2 vCPU
  - 4 GB RAM
  - 80+ GB SSD
- **Docker Compose** fuer reproduzierbares Deployment.
- **Reverse Proxy (Caddy oder Nginx)** mit HTTPS.
- **MongoDB** als eigener Container oder Managed MongoDB.
- **Server (Node/Express)** + **Client (Vite Build, statisch ausgeliefert)**.

## 2. Umgebungen
- `dev`: lokale Entwicklung.
- `staging` (optional, aber sinnvoll): finaler Test vor Produktion.
- `prod`: Live-System fuer Studienteilnehmer.

## 3. Domain, TLS, Zugriff
- Eigene Domain/Subdomain (z. B. `ux-study.example.de`).
- HTTPS Pflicht (TLS-Zertifikat via Let's Encrypt).
- Admin-Zugriff nur fuer bekannte Accounts, starke Passwoerter.
- Optional: Admin-Bereich zusaetzlich per IP-Whitelist oder VPN absichern.

## 4. Produktionskonfiguration
- `.env` nur auf Server, nicht im Repo.
- Wichtige Variablen:
  - `NODE_ENV=production`
  - `PORT`
  - `MONGODB_URI`
  - `JWT_SECRET` (lang, zufaellig, sicher)
  - `CLIENT_ORIGIN` (exakte Frontend-URL)
  - `ADMIN_BOOTSTRAP_KEY` (nur initial, danach entfernen/rotieren)
- Cookies in Produktion auf `secure=true`.

## 5. Datenbank & Persistenz
- MongoDB mit persistentem Volume.
- Upload-Ordner ebenfalls persistent speichern.
- Regelmaessige Backups:
  - taeglich automatisiert
  - Aufbewahrung z. B. 14-30 Tage
  - Restore-Probe 1x pro Monat.

## 6. Deployment-Ablauf (Standard)
1. Code in `main` mergen.
2. Build/Test lokal oder in CI ausfuehren.
3. Auf Server deployen (z. B. `git pull` + `docker compose up -d --build`).
4. Smoke-Test:
   - Login/Register
   - Studie starten
   - Consent-Flow
   - Admin-Auswertung/Export
5. Bei Fehlern: Rollback auf letzte funktionierende Version.

## 7. Monitoring & Betrieb
- Basis-Monitoring:
  - Container-Status
  - CPU/RAM/Platte
  - Uptime-Check (`/health`)
- Logs zentral sammeln (mind. Rotationsstrategie).
- Alarmierung bei:
  - App down
  - DB nicht erreichbar
  - Platte fast voll.

## 8. Sicherheit (Minimum)
- Starkes `JWT_SECRET`, keine Secrets im Git.
- Regelmaessige Dependency-Updates.
- Rate-Limit auf Login aktiv lassen.
- CORS restriktiv nur fuer produktive Client-Origin.
- Admin-Rollen regelmaessig pruefen.

## 9. Datenschutz & Compliance im Projekt
- Datenschutztext versioniert halten.
- Bei Aenderung: erneute Zustimmung erzwingen (bereits vorgesehen).
- Exporte/Auswertungen ohne Klarnamen (nur Rolle, Alter, wichtige Woerter etc.).
- Loesch-/Anonymisierungskonzept fuer Projektende festlegen.

## 10. Release-Checkliste (vor Go-Live)
- [ ] HTTPS aktiv
- [ ] Produktions-`.env` korrekt
- [ ] Admin-Konten und Passwortrichtlinie geprueft
- [ ] Consent-Flow getestet (neu + re-consent nach Policy-Update)
- [ ] Backup-Job aktiv + Restore getestet
- [ ] Monitoring/Alerting aktiv
- [ ] Test mit 10-20 parallelen Sessions bestanden
- [ ] Dokumentation fuer Betrieb/Notfall vorhanden

## 11. Notfallplan (kurz)
- Incident erkennen (Monitoring/Fehlermeldung).
- Service stabilisieren (Neustart, DB-Verbindung, Storage pruefen).
- Bei Bedarf Rollback.
- Datenintegritaet pruefen.
- Ursache dokumentieren, Fix deployen, Lessons Learned notieren.

## 12. Zeitplan (realistisch, kompakt)
- Tag 1: Server, Domain, TLS, Docker Compose.
- Tag 2: Deployment-Pipeline + Backup + Monitoring.
- Tag 3: End-to-End Tests, Lasttest (20 User), Go-Live.

