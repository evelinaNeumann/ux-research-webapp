# Tech Stack (aktuell)

## Frontend
- React
- React Router
- Fetch API
- Komponenten + separate CSS-Dateien pro Bereich
- Vite Build

## Backend
- Node.js
- Express
- Mongoose
- JWT (`jsonwebtoken`)
- Passwort-Hashing (`bcryptjs`)
- Uploads (`multer`)
- Rate-Limiting (`express-rate-limit`)

## Datenbank
- MongoDB
- Collections für Studien, Profile, Sessions, Antworten, Analytics

## Analytics/Export
- Serverseitige Aggregation (Mongo + Service Layer)
- Exporte: CSV, JSON, PDF
- PDF-Generierung im Backend (strukturierter Report mit Seitenlayout)

## Laufzeit & Betrieb
- Lokale Entwicklung auf `localhost`
- API-Base aktuell: `http://localhost:4000`
- Statische Upload-Auslieferung über `/uploads`

## Qualitätsvorgaben (Frontend)
- Moderner neutraler Stil
- Akzentfarbe gezielt, Anteil <= 8%
- Symmetrische Admin-Layouts
- Klare Erfolgs-/Fehlermeldungen
