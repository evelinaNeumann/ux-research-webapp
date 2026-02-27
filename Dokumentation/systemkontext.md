# Systemkontext & Screenflow (aktuell)

## 1. Systemkontext
Die App ist ein lokales Research-System für Planung, Durchführung und Auswertung von UX-Studien.

### Komponenten
- Frontend: React
- Backend: Node.js + Express
- Datenbank: MongoDB
- Upload-Storage: lokales Filesystem (`server/uploads`)

### Akteure
- `User`: bearbeitet zugewiesene Studien.
- `Admin`: verwaltet Inhalte, Nutzer und Auswertungen.

## 2. Systemgrenzen
### Innerhalb
- Registrierung/Login
- Studien- und Contentverwaltung
- Session-Durchführung inkl. Resume/Read-only
- Analytics + Export (CSV/JSON/PDF)

### Außerhalb
- Kein externer IdP
- Kein externes Tracking
- Kein Cloud-SaaS-Ziel im aktuellen Scope

## 3. Wichtiger Datenfluss
1. Admin konfiguriert Studien + Inhalte + Zuweisungen.
2. User sieht nur zugewiesene aktive Studien.
3. Vor Start: User-Profil je Studie muss vorliegen.
4. User bearbeitet Session, speichert Antworten, schließt ab.
5. Admin wertet Daten nach Profilfiltern aus und exportiert Berichte.

## 4. Screenflow User
- Registrierung/Login
- Dashboard
- Profil-Setup (falls für Studie noch nicht vorhanden)
- Session (nur Module mit vorhandenem Content)
- Aufgabenbearbeitung:
  - nur eine Aufgabe gleichzeitig sichtbar,
  - Schritte in Admin-Reihenfolge,
  - optionales Zeitlimit je Schritt mit Auto-Weiterleitung,
  - Timeout im letzten Schritt beendet die Aufgabe automatisch.
- Abschluss (nur bei vollständig bearbeiteten Pflichtmodulen)
- Danach read-only ansehen

## 5. Screenflow Admin
- Login
- Studienverwaltung (CRUD, Beschreibung, PDF-Briefing)
- Contentpflege (Fragen/Cards/Card-Sorting-Spalten/Bilder/Page Tree/Aufgaben)
- Aufgaben:
  - mehrstufige Aufgabenstellungen,
  - mehrere PDF/HTML-Anhänge je Aufgabe,
  - Zeitlimit pro Schritt.
- Studien-Zuweisung
- Analytics:
  - KPI + Chart
  - globaler Filterblock
  - Studienmodule-Reiter
  - User Portraits + Profil-Daten-Auswertung
  - PDF/JSON/CSV Exporte

## 6. Qualitätskontext (homogene Weiterentwicklung)
Diese Regeln gelten für alle Folgeänderungen:
- Konsistente deutsche Begriffe in UI/API-Fehlern.
- Filterlogik immer end-to-end: UI -> API -> Aggregation -> Export.
- Abschlossene Sessions sind unveränderbar.
- Layout-Symmetrie zwischen vergleichbaren Admin-Cards.
- Neue UI-Bereiche als eigene Komponente mit separatem CSS.
- Keine regressiven Datenzählungen: Analytics zählt pro Session+Frage den letzten Stand.
- Aufgaben-Analytics muss `falsch geklickt` und `Zeit abgelaufen` getrennt ausweisen.
