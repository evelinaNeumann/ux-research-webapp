1️⃣ Projektziel

Baue eine produktionsfähige Web-App für UX-Research mit:

Registrierung & Login

Rollenmodell (User/Admin)

Questionnaire

Card Sorting

Image Rating (5-Sekunden-Test)

Admin Analytics & CSV/JSON Export

Server Deployment (HTTPS)

MongoDB

JWT Auth

2️⃣ Scope Definition
✅ In Scope (MVP)

Alle 3 Module

Mixed Study Typ

Admin konfiguriert Reihenfolge

Session Resume ab letztem Schritt

Version Freeze pro Session (Study.version wird gespeichert)

CSV + JSON Export

Gruppenfilter (testGroup, ageGroup, interests, needs, date range)

❌ Explicitly Out of Scope

Kein E-Mail-System



Kein Social Login (Google, GitHub etc.)

Kein Cloud Hosting

Keine automatische Clusteranalyse

Kein A/B-Testing



Kein KI-Analytics

Keine Public Study Links

3️⃣ Tech Stack (fix)

Frontend:

React

React Router

dnd-kit

React Hook Form

Backend:

Node.js (LTS)

Express

Mongoose

Auth:

JWT in HTTP-only Cookie

8h Session Expiry

Rate Limit: 5 Login Attempts / 5 Minuten / IP

Deployment:

VPS / Server

Nginx Reverse Proxy

HTTPS (TLS)

PM2

DB:

MongoDB (nicht öffentlich erreichbar)

Architektur gemäß: 

architecture (2)

4️⃣ Rollen & RBAC
USER

Darf:

Eigene Sessions starten

Eigene Session-Inhalte lesen

Während aktiver Session bearbeiten/löschen

Nach Abschluss: nur lesen

Darf NICHT:

Inhalte anderer User lesen

Studienkonfiguration sehen

Analytics sehen

ADMIN

Darf:

Studies erstellen/ändern/löschen

Fragen/Karten/Bilder verwalten

Alle Sessions lesen

Analytics ausführen

Exportieren

5️⃣ Study Engine Regeln

Study Types:

questionnaire | card_sort | image_rating | mixed

Mixed:

Reihenfolge durch Admin konfigurierbar

Default:

questionnaire

card_sort

image_rating

Randomisierung:

❌ Nein

Pflichtmodule:

Überspringen erlaubt

Muss bewusst bestätigt werden

Fortschritt:

Pro Modul

Resume:

Ab letztem Schritt

Versionierung:

Study.version wird in Session gespeichert

Änderungen gelten nicht für laufende Sessions

6️⃣ Datenmodell (final)

Basierend auf 

database-schema

Zusätzliche Anforderungen:

Indexes:

User.username (unique)
Session.user_id
Session.study_id
Answer.session_id
CardSort.session_id
ImageRating.session_id
Profile.test_group_id
Session.created_at
7️⃣ API-Spezifikation (verbindlich)

Basierend auf 

api

Jeder Endpoint:

Auth required (außer register/login)

Error Codes:

400 Validation

401 Unauthorized

403 Forbidden

404 Not Found

Pagination:

GET /studies?page=&limit=

GET /sessions?page=&limit=

Export:

GET /analytics/export?format=csv

GET /analytics/export?format=json

8️⃣ Analytics (exakt definieren)

Basierend auf 

analytics

Questionnaire

Likert:

avg

median

stddev

n

Choice:

counts

percentage

Image Rating

avg per image

avg per group

rating distribution

Card Sorting (MVP)

Häufigkeit pro Gruppe

Co-occurrence Count (zwei Karten in gleicher Gruppe)

Filter:

testGroup

ageGroup

interests

needs

date range

Export CSV Spalten:

studyId
studyVersion
moduleType
questionId
metricType
value
group
n
dateRange
9️⃣ UI Spezifikation

Card Sorting:

Kartenpool links

Kategorien rechts

Neue Kategorie erstellen: JA

Kategorie löschen: JA

Image Test:

Timer 5 Sekunden

Auto Advance

Vor/Zurück erlaubt

States:

loading

empty

error

success

🔟 File Upload Regeln

Images:

Speicherung: lokales Filesystem

Max Size: 5MB

Allowed Types: jpg, png, webp

Dateiname UUID

Nur Admin Upload

1️⃣1️⃣ Definition of Done

MVP ist fertig wenn:

User kann sich registrieren

Login funktioniert

JWT Cookie gesetzt

Study erstellen möglich

Mixed Study läuft korrekt

Session Resume funktioniert

Version Freeze funktioniert

Card Sorting speichert korrekt

Image Rating speichert korrekt

Analytics liefert korrekte Werte

Filter funktionieren

CSV Export korrekt formatiert

RBAC korrekt enforced

MongoDB nicht öffentlich erreichbar

HTTPS aktiv

1️⃣2️⃣ Build Struktur (empfohlen)

Monorepo:

/client
/server

Root:

npm run dev (concurrently)
npm run build
