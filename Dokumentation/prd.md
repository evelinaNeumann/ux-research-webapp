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
- Passwort-vergessen-Flow mit Admin-Freigabe:
  - User: `Passwort vergessen` mit Username.
  - Admin: Anfrage freigeben/ablehnen.
  - User setzt neues Passwort mit Username ohne Alt-Passwort.
- Userlöschung durch Admin.

### 4.2 Studienverwaltung
- Studie anlegen, bearbeiten, löschen.
- Felder: Name, Typ, Beschreibung, Aktivstatus.
- Studienbriefing als PDF-Upload (Datei auswählen + Drag & Drop).
- Studienverwaltung ist zuklappbar.

### 4.3 Inhaltsverwaltung (Admin)
- CRUD für Fragen, Cards, Aufgaben, Profil-Card-Wörter.
- Aufgaben: mehrere Schritte je Task mit definierter Reihenfolge.
- Aufgaben: pro Schritt optionales Zeitlimit (`time_limit_sec` in Sekunden).
- Aufgaben: mehrere PDF/HTML-Dateien pro Task uploadbar; Datei pro Task-Schritt auswählbar; Dateien einzeln löschbar.
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
- Abschluss nur erlaubt, wenn alle verpflichtenden Module vollständig sind:
  - Interview vollständig
  - Card Sorting: alle Admin-Cards zugeordnet
  - Bildbewertung vollständig
  - Interaktive Aufgaben: alle Schritte beantwortet (korrekt oder falsch)
- Bei Abschluss werden aktuelle Eingaben gespeichert, dann Session beendet.
- Task-Timeout-Verhalten:
  - bei Zeitablauf wird Schritt automatisch als `timed_out` gespeichert,
  - automatisch zum nächsten Schritt gewechselt,
  - beim letzten Schritt wird Task automatisch beendet.
- Nach automatischem Task-Ende (Timeout im letzten Schritt) erfolgt nach 3 Sekunden automatische Rückleitung ins Dashboard.

### 4.7 Dashboard (User)
- Offene Studien separat.
- Hinweistext wenn keine offene/zugewiesene Studie vorhanden ist.
- Bereits bearbeitete Studien in eigener Sektion.
- `Meine Sessions`-Logik in bearbeitete Studien integriert.
- Aufgabenansicht zeigt pro Studie immer nur **eine** Aufgabe gleichzeitig (vor/zurück Navigation).

### 4.8 Auswertung (Admin)
- KPI + Study-Chart.
- Zuklappbarer Reiter `Studienmodule` mit Tabs:
  - Interview: Fragetext + alle Antworten einzeln.
  - Card Sorting.
  - Bildauswertung.
  - Aufgabenbearbeitung.
- Gemeinsamer Filterblock (unterhalb Study-Chart): Alter, Rolle, wichtiges Wort.
- Zuklappbarer Reiter `User Portraits und Profil-Daten Auswertung`:
  - Portrait-Karten pro Nutzer.
  - Verteilungen als Balkendiagramme.
- Exporte:
  - User Portraits + Profil-Auswertung: JSON/PDF.
  - Studienmodule: JSON/PDF.
- Aufgaben-Auswertung differenziert:
  - `korrekt`
  - `falsch geklickt`
  - `Zeit abgelaufen`
- Aufgaben-Diagramme als Kreisdiagramme (2er Card-Layout in UI) pro Task und pro Task-Schritt.

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
