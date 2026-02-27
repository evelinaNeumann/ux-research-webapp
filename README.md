# UX Research Web App

Monorepo mit:
- `server` (Node.js, Express, MongoDB, JWT Cookie Auth)
- `client` (React + Vite)

## Setup

1. Abhängigkeiten installieren:
```bash
npm install
```

2. Server-Umgebung:
```bash
cp server/.env.example server/.env
```
Setze in `server/.env` einen starken `ADMIN_BOOTSTRAP_KEY`.

3. Optional Demo-Daten (Admin + Demo Study):
```bash
npm run seed -w server
```

4. Dev starten:
```bash
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:4000`

## Demo Admin (nur wenn `seed` ausgeführt)
- Username: `admin`
- Passwort: `Admin12345!`

## Admin-Regeln
- `POST /auth/register` erstellt immer nur `role=user`.
- Ein erster Admin kann einmalig über `POST /auth/register-admin` mit `bootstrapKey` erstellt werden.
- Danach können Admin-Rechte nur durch bestehende Admins vergeben/entzogen werden:
  - `GET /admin/users`
  - `PUT /admin/users/:userId/role` mit `{ \"role\": \"admin\" | \"user\" }`
- Schutz eingebaut:
  - letzter Admin kann nicht degradiert werden
  - eigener Admin-Entzug ist blockiert

## Enthaltene MVP-Teile
- Auth: Register/Login/Logout/Me
- RBAC: `user` / `admin`
- Studies CRUD (admin), listing (user)
- Sessions starten, lesen, abschließen, Resume auf laufende Session
- Research Endpunkte: Answers, CardSort, ImageRating
- Research Endpunkte: Answers, CardSort, ImageRating, TaskResponse
- Admin Content Studio API: Questions, Cards, Images, Page Tree, Tasks
- Analytics Overview + Export (`/analytics/export?format=csv|json`)

## Aktueller Funktionsstand (Kurz)
- Studienmodule: Interview, Card Sorting, Bildauswertung, Aufgabenbearbeitung.
- Aufgabenbearbeitung:
  - mehrstufige Aufgaben,
  - optionales Zeitlimit pro Schritt,
  - Timeout speichert als eigener Status und wechselt automatisch zum nächsten Schritt,
  - nur eine Aufgabe gleichzeitig sichtbar (User-UI).
- Analytics:
  - Studienmodule-Auswertung inkl. Aufgaben,
  - Aufgaben mit Trennung `korrekt` / `falsch geklickt` / `Zeit abgelaufen`,
  - Export als PDF/JSON.

## Doku
- PRD: `Dokumentation/prd.md`
- Features: `Dokumentation/features.md`
- API: `Dokumentation/api.md`
- Analytics: `Dokumentation/analytics.md`
- MongoDB: `Dokumentation/mongodb-kollektionen.md`, `Dokumentation/database-schema.md`

## Wichtiger Hinweis
PNG-Chart-Export ist als Endpoint scaffolded (`POST /analytics/export/chart`) und gibt aktuell `501` zurück.
