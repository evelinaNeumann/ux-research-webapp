# System Architecture Overview (aktuell)

## High-Level
Client (React) -> Express API -> MongoDB
                       |
                       +-> File Upload Storage (`server/uploads`)

## Backend-Schichten
- Routes: Auth, Studies, Sessions, Research, Profile, Admin Content, Analytics
- Middleware: Auth/RBAC, Upload, Pagination, Error Handler
- Services: Analytics-Aggregation
- Models: Mongoose-Schemas für Studien-, Profil- und Ergebnisdaten

## Sicherheitsmodell
- JWT im HTTP-only Cookie
- Rollenprüfung (`user`/`admin`) pro Route
- Login-Rate-Limiter
- Passwort-Hashing (`bcryptjs`)

## Data-Integrity-Regeln
- Session `done` => read-only
- Session-Abschluss nur bei vollständigem Interview
- User sieht nur aktive zugewiesene Studien
- Analytics-Filter greifen serverseitig

## Upload-Architektur
- Bilder: `server/uploads`
- Studien-PDF: `server/uploads/study-briefs`
- Statische Auslieferung über `/uploads`

## Analytics-Architektur
- KPI, Moduldaten, Portraitdaten aus Mongo-Aggregation
- Profilfilter (Alter/Rolle/Wort) bestimmen Ziel-Usermenge
- Exporte:
  - Global CSV/JSON
  - Portrait-Report PDF/JSON
  - Studienmodule PDF/JSON

## Skalierungs-/Wartungshinweise
- Indexe für Sessions/Answers/Profiles sind Pflicht
- Aggregationen sind filterbasiert aufgebaut (reduziert Payload)
- UI ist komponenten- und CSS-separiert (Wartbarkeit)
