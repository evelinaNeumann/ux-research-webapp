# Product Requirements Document (PRD)
# UX Research & Evaluation Web App

## 1. Zielbild
Die Anwendung unterstützt UX-Research-Studien von Planung bis Auswertung in einer lokal betriebenen Web-App (React + Express + MongoDB).

## 2. Kernziele
- Studien zentral über UI verwalten (ohne DB-Eingriffe).
- Teilnehmer sauber zuweisen und pro Studie durchführen lassen.
- Ergebnisse pro Nutzer und pro Studie auswerten.
- Exporte für Projektbericht-Anlagen bereitstellen (JSON/CSV/PDF).

## 3. Rollen
- `user`: sieht nur zugewiesene aktive Studien, füllt Profil je Studie aus, bearbeitet nur offene Sessions.
- `admin`: verwaltet Inhalte, Nutzerrollen, Zuweisungen, Studien, Auswertungen und Exporte.

## 4. Umgesetzte Muss-Anforderungen
### 4.1 Auth & Benutzer
- Registrierung mit Passwort-Policy (deutsche Fehlermeldung).
- Auto-Login nach erfolgreicher Registrierung.
- Admin-Bootstrap über `ADMIN_BOOTSTRAP_KEY`.
- Rollenvererbung (Admin kann Nutzer zu Admin machen).
- Passwortänderung für User und Admin.
- Userlöschung durch Admin.

### 4.2 Studienverwaltung
- Studie anlegen, bearbeiten, löschen.
- Felder: Name, Typ, Beschreibung, Aktivstatus.
- Studienbriefing als PDF-Upload (Datei auswählen + Drag & Drop).
- Studienverwaltung ist zuklappbar.

### 4.3 Inhaltsverwaltung (Admin)
- CRUD für Fragen, Cards, Aufgaben, Profil-Card-Wörter.
- Nutzerzuweisung zu Studien (separater Studien-Selector, aufklappbar).
- Label `questionnaire` in UI als `Interview`.

### 4.4 Profil vor Studienstart
- Pflichtprofil pro Studie: Altersspanne, Rolle, 4 wichtige Wörter.
- Profile werden auch bei Bestandsnutzern vor Start erzwungen.
- Eigene Seite für Nutzerprofil-Daten; User read-only nach Speichern, Admin kann korrigieren.

### 4.5 Profil-Vererbung zwischen Studien
- Konfigurierbar pro Studie:
  - Profil-Card-Wörter aus Quellstudie übernehmen.
  - User-Schlüsselwörter aus Quellstudie vorbefüllen.
- Import-Endpunkt für sofortige Übernahme von Profil-Card-Wörtern.

### 4.6 Session-Logik
- Eine Studie kann während `in_progress` fortgesetzt werden.
- Nach `done` nur noch read-only ansehen.
- Abschluss nur erlaubt, wenn alle Interview-Fragen beantwortet sind.
- Bei Abschluss werden aktuelle Eingaben gespeichert, dann Session beendet.

### 4.7 Dashboard (User)
- Offene Studien separat.
- Hinweistext wenn keine offene/zugewiesene Studie vorhanden ist.
- Bereits bearbeitete Studien in eigener Sektion.
- `Meine Sessions`-Logik in bearbeitete Studien integriert.

### 4.8 Auswertung (Admin)
- KPI + Study-Chart.
- Zuklappbarer Reiter `Studienmodule` mit Tabs:
  - Interview: Fragetext + alle Antworten einzeln.
  - Card Sorting.
  - Bildauswertung.
- Gemeinsamer Filterblock (unterhalb Study-Chart): Alter, Rolle, wichtiges Wort.
- Zuklappbarer Reiter `User Portraits und Profil-Daten Auswertung`:
  - Portrait-Karten pro Nutzer.
  - Verteilungen als Balkendiagramme.
- Exporte:
  - User Portraits + Profil-Auswertung: JSON/PDF.
  - Studienmodule: JSON/PDF.

## 5. Qualitätsleitlinien (verbindlich)
- Deutsche, konsistente UI-Texte und Fehlermeldungen.
- Einheitliche Layout-Symmetrie in Admin-Cards (Collapse/Actions).
- Komponenten + separates CSS pro Bereich.
- Modernes neutrales Design mit Akzentfarbe <= 8%.
- Keine Bearbeitung abgeschlossener Sessions.
- Filter müssen konsistent auf UI, Aggregation und Export wirken.

## 6. Nicht-Ziele (aktuell)
- Cloud-Multi-Tenant-Betrieb.
- Externe IdP-Integration.
- Vollautomatisierte Clusteranalyse (nur Basisaggregation).
