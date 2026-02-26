# Product Requirements Document (PRD)

# UX Research & Evaluation Web App

## 1. Produktübersicht

Die geplante Web-App dient der strukturierten Durchführung und Auswertung nutzerzentrierter Research- und Evaluationsmethoden im Kontext von UI-/UX-Projekten gemäß menschzentriertem Gestaltungsprozess (DIN EN ISO 9241-210) und Double-Diamond-Modell.

Die Anwendung ermöglicht es mehreren Nutzer:innen gleichzeitig:

* Interviews / Fragebögen durchzuführen
* Card-Sorting-Studien zu absolvieren
* Bildbewertungen (z. B. 5-Sekunden-Test) abzugeben
* strukturierte Fragen zu beantworten
* Sessions neu zu starten oder fortzusetzen

Alle Eingaben werden nutzerspezifisch gespeichert und können anschließend vergleichend analysiert werden.

Die Web-App wird lokal betrieben und nutzt eine lokal installierte MongoDB-Datenbank.

---

## 2. Zielsetzung des Produkts

Die Web-App unterstützt Studierende, UX-Designer:innen und Projektteams bei der:

* Durchführung generativer Research-Methoden
* Durchführung formativer Evaluation
* Datensammlung für Projektberichte
* Vergleichenden Analyse von Nutzerverhalten
* Dokumentation von Test- und Evaluierungsergebnissen

Das Tool soll Research- und Evaluationsprozesse systematisieren und reproduzierbar machen.

---

## 3. Problemstellung

Im Rahmen von UI-/UX-Projekten werden Methoden wie:

* Interviews
* User-Need-Statements
* Card Sorting
* 5-Sekunden-Test
* Usability Tests

häufig manuell oder mit verteilten Tools durchgeführt. Dies erschwert:

* strukturierte Datenspeicherung
* Vergleichbarkeit
* Mehrnutzerbetrieb
* saubere Dokumentation für Projektberichte

Die Web-App schließt diese Lücke durch eine integrierte Lösung.

---

## 4. Zielgruppen

### Primäre Zielgruppe

* UX-Studierende
* UI-Designer:innen
* Projektteams im Bereich Human-Centered Design

### Sekundäre Zielgruppe

* Lehrende im Bereich User Interface Design
* Agenturen mit Bedarf an strukturierten Research-Tools

---

## 5. User Stories

### 5.1 Interview / Fragebogen

**Als Researcher** möchte ich Fragen definieren können, damit Nutzer:innen strukturierte Antworten geben können.

**Als Nutzer:in** möchte ich Fragen in Textfeldern beantworten können, damit meine Antworten gespeichert werden.

---

### 5.2 Card Sorting

**Als Researcher** möchte ich Karten (Begriffe/Inhalte) definieren können, damit Nutzer:innen diese strukturieren können.

**Als Nutzer:in** möchte ich Karten frei gruppieren können, damit meine mentale Struktur sichtbar wird.

**Als Nutzer:in** möchte ich eine neue oder bestehende Session fortsetzen können.

---

### 5.3 Bildbewertung / 5-Sekunden-Test

**Als Researcher** möchte ich Bilder hochladen können, damit Nutzer:innen diese bewerten können.

**Als Nutzer:in** möchte ich ein Bild zeitlich begrenzt sehen und anschließend bewerten können.

---

### 5.4 Datenspeicherung

**Als System** speichere ich alle Eingaben nutzerspezifisch in MongoDB.

**Als Researcher** möchte ich Antworten pro Nutzer analysieren können.

---

### 5.5 Vergleichsanalyse

**Als Researcher** möchte ich Antworten mehrerer Nutzer vergleichen können, damit ich Muster und Trends erkennen kann.

Mögliche Analysefunktionen:

* Clusteranalyse (Card Sorting)
* Durchschnittsbewertungen (Bildtests)
* Häufigkeitsanalyse von Antworten
* Export als JSON/CSV

---

### 5.6 Visualisierungen & Berichte

**Als Researcher** möchte ich pro Nutzer:in grafische Auswertungen sehen, damit ich individuelle Verhaltensmuster erkennen kann.

**Als Researcher** möchte ich pro Studie aggregierte Grafiken sehen, damit ich Unterschiede zwischen Gruppen und Studienversionen vergleichen kann.

**Als Researcher** möchte ich Visualisierungen exportieren können, damit ich sie direkt im Projektbericht verwenden kann.

---

### 5.7 Vollständige Research-Inhaltsverwaltung (Admin)

**Als Admin** möchte ich alle research-relevanten Inhalte über die UI anlegen und ändern können, damit keine direkten Datenbank- oder Code-Eingriffe nötig sind.

**Als Admin** möchte ich Fragen, Cards, Bilder, Page-Tree-Strukturen und Aufgaben zentral verwalten können, damit Studien vollständig in der Web-App konfigurierbar sind.

---

## 6. Funktionale Anforderungen

### 6.0 Rollen & Berechtigungen

* **Teilnehmer:in (User):** kann Studien durchführen (Fragebogen, Card Sorting, Bildbewertung), Sessions fortsetzen, eigene Ergebnisse nicht einsehen.
* **Admin (Researcher):** kann Inhalte/Items verwalten (Fragen, Karten, Bilder), Studien konfigurieren, Teilnehmergruppen definieren, Auswertungen erzeugen und exportieren.

### 6.1 Nutzerverwaltung & Authentifizierung

* Registrierung beim ersten Zugriff
* Danach Login mit **Benutzername + Passwort**
* Passwortregeln:

  * mind. **11 Zeichen**
  * enthält **Groß- und Kleinbuchstaben**, **Zahl** und **Sonderzeichen**
  * darf den Benutzernamen (oder Teile davon) nicht enthalten
* Session-Management (Login-Sessions) mit automatischem Timeout
* Passwort-Reset (MVP optional)

### 6.2 Teilnehmerprofile & Testgruppen

* Erfassung (optional/konfigurierbar) von Profilmerkmalen zur Gruppierung:

  * Altersspanne (z. B. 18–24, 25–34, …)
  * Interessen (vordefinierte Tags)
  * Bedürfnisse/Erfahrung (z. B. „IT-affin“, „Entscheider:in“, „Einsteiger:in“)
* Zuweisung zu **Testgruppen** (manuell durch Admin oder regelbasiert)
* Auswertungen filterbar nach Gruppe sowie gruppenübergreifend vergleichbar

### 6.3 Research-Module

#### Modul 1 – Fragebogen

* Dynamische Fragen (durch Admin konfigurierbar)
* Fragetypen:

  * Textfelder (kurz/lang)
  * Single Choice
  * Multiple Choice
  * Likert-Skalen
* Validierungen (Pflichtfelder, min/max Länge)

#### Modul 2 – Card Sorting

* Drag-and-Drop Interface
* Karten (Items) durch Admin definierbar
* Freies Sortieren (Open Card Sort)
* Optional vordefinierte Kategorien (Closed/Hybrid)
* Speicherung der finalen Gruppen inkl. Gruppennamen

#### Modul 3 – Bildbewertung / 5-Sekunden-Test

* Bildverwaltung durch Admin (Upload/Zuordnung zu Studie)
* Zeitsteuerung (z. B. 5 Sekunden)
* Bewertungsskala (z. B. 1–5) + optionales Freitext-Feedback
* Optional: Recall-Frage nach Anzeige (z. B. „Woran erinnern Sie sich?“)

### 6.4 Admin-Panel (Content & Studiensteuerung)

* CRUD für:

  * Fragenkataloge (Versionierung)
  * Card-Sort Karten (Versionierung)
  * Bildsets (Versionierung)
  * Page Tree (Seitenstruktur / Navigationshierarchie je Studie)
  * Aufgaben/Tasks (Research-Aufgaben je Modul/Seite)
  * Studienkonfiguration (Ablauf, Reihenfolge, Randomisierung)
* Aktiv/Inaktiv-Status von Studien
* Zuweisung von Studien zu Testgruppen
* Medienverwaltung in der UI (Upload, Ersetzen, Löschen, Metadaten pflegen)
* Validierung und Vorschau vor Veröffentlichung von Inhalten
* Versionierbare Inhaltsstände pro Studie (Rollback auf vorherige Version)

### 6.5 Auswertung & Export (Projektbericht-orientiert)

* Auswertungen **pro Kategorie** (Fragebogen / Card Sorting / Bildbewertung)

* Auswertungen **summiert** (gesamt über alle Module)

* Auswertungen **pro Nutzer:in** (individueller Verlauf und Einzelresultate)

* Auswertungen **pro Studie** (aggregiert inkl. Vergleich nach Studienversion/Testgruppe)

* Filter nach:

  * Testgruppe
  * Altersspanne
  * Interessen/Bedürfnisse
  * Zeitraum

* Ergebnisformate:

  * Tabellenansichten in der UI
  * Grafische Dashboards in der UI (z. B. Balken-, Linien-, Radar-, Heatmap- und Verteilungsdiagramme)
  * Export von Grafiken als **PNG/SVG** (MVP: PNG)
  * Export als **CSV/JSON**
  * „Projektbericht-Export“ (strukturierte Zusammenfassung für Dokumentation, MVP optional)

* Beispiele für Auswertungslogiken:

  * Fragebogen: Häufigkeiten, Mittelwerte (Skalen), Top-Antworten
  * Bildbewertung: Durchschnitt, Streuung, Gruppenvergleich
  * Card Sorting: Ähnlichkeitsmatrix/Cluster (MVP: einfache Aggregation; später: automatische Clusteranalyse)
  * Nutzerdetail: Zeitverlauf pro Session, Antwortprofil, individuelle Abweichung vs. Studiendurchschnitt
  * Studienübersicht: KPI-Kacheln (Teilnahmen, Abschlussrate, Durchschnittswerte, Varianz) + Segmentvergleich

### 6.6 Analytics-Dashboard

* Dashboard mit zwei Perspektiven:

  * **User View:** Detailseite pro Nutzer:in über alle absolvierten Module und Sessions
  * **Study View:** Gesamtansicht pro Studie mit Filterung nach Gruppe, Zeitraum, Version
* Interaktive Filter (Modul, Zeitraum, Testgruppe, Studienversion)
* Vergleichsansicht mit mindestens 2 auswählbaren Nutzer:innen oder Studien
* Klick auf Diagramm öffnet zugrunde liegende Datentabelle (Traceability)
* Speicherung von Dashboard-Ansichten als Presets (MVP optional)

### 6.1 Nutzerverwaltung

* Mehrere Nutzer gleichzeitig
* Session-ID
* Optionale Registrierung oder anonyme Nutzung
* Fortsetzen bestehender Sessions

### 6.2 Research-Module

#### Modul 1 – Fragebogen

* Dynamische Fragen
* Textfelder
* Multiple Choice
* Skalierungsfragen

#### Modul 2 – Card Sorting

* Drag-and-Drop Interface
* Eigene Kategorien erstellen
* Vordefinierte Kategorien möglich
* Speicherung der finalen Struktur

#### Modul 3 – Bildbewertung

* Bildanzeige
* Zeitsteuerung (z. B. 5 Sekunden)
* Bewertungsskala
* Offene Feedback-Felder

---

## 7. Nicht-funktionale Anforderungen

### 7.1 Betrieb & Technologie

* Lokale Installation / lokaler Betrieb
* Frontend: **React**
* Backend: Node.js/Express (empfohlen)
* Datenbank: **MongoDB lokal**
* Mehrnutzerfähigkeit (parallele Sessions)

### 7.2 Performance & UX

* Reaktionsschnelle UI (insb. Drag-and-Drop)
* Responsive Design
* Fehlertoleranz (Zwischenspeichern/Autosave bei Modulen)
* Frontend-Komponentenarchitektur: jede größere UI-Einheit als separate Komponente mit eigener, separater CSS-Datei
* Wartbarkeit: klare Trennung von Struktur (Komponente), Logik und Styling; keine globalen Inline-Stilblöcke als Standard
* UI-Designstil: modern und neutral
* Farbakzente auf max. **8%** der sichtbaren UI-Fläche begrenzen (Primary/Accent sparsam einsetzen)

### 7.3 Datenschutz, Anonymität & Sicherheit

* Datensparsamkeit: nur notwendige Profilmerkmale, optional einstellbar
* Pseudonymisierung: interne User-ID getrennt von Anzeige-/Login-Name
* Passwortspeicherung ausschließlich als sicherer Hash (z. B. bcrypt/argon2)
* Schutz vor einfachen Angriffen:

  * Rate-Limiting bei Login
  * CSRF-/XSS-Basisschutz
  * Eingabevalidierung und Sanitizing
* Rollenbasierte Zugriffssteuerung (Admin vs. User)
* Export anonymisiert (keine direkten Identifikatoren)
* Audit-Feld(er) für Admin-Änderungen an Studieninhalten (Versionierung/Änderungsverlauf)

### 7.4 Nachvollziehbarkeit für Projektbericht

* Studienversionen werden mitgespeichert, damit Auswertungen reproduzierbar sind

* Zeitstempel je Session und je Antwort

* Lokale Installation

* MongoDB als Datenbank

* Mehrnutzerfähigkeit

* Reaktionsschnelle UI

* Responsive Design

* Datenschutzkonform (keine Cloud-Speicherung)

---

## 8. Systemarchitektur (High-Level)

Frontend:

* Web-App (z. B. React / Vue / Next.js)
* Drag-and-Drop Library

Backend:

* Node.js Server
* Express API

Datenbank:

* MongoDB (lokal installiert)
* Collections:

  * users
  * sessions
  * answers
  * card_sorts
  * image_ratings

---

## 9. Datenmodell (vereinfachte Struktur)

### User

* _id (intern, nicht sprechend)
* username (Login-Name)
* password_hash
* role (user | admin)
* created_at

### Profile (optional, getrennt für Pseudonymisierung)

* _id
* user_id
* age_group
* interests (tags[])
* needs (tags[])
* test_group_id

### TestGroup

* _id
* name
* criteria (optional)

### Study

* _id
* name
* type (questionnaire | card_sort | image_rating | mixed)
* config (Ablauf, Randomisierung, Zuweisungen)
* version
* is_active
* created_at

### PageTreeNode

* _id
* study_id
* parent_id (optional)
* title
* node_type (page | section | task_container)
* order_index
* is_active
* version

### ResearchTask

* _id
* study_id
* page_node_id
* title
* description
* task_type (instruction | question_block | cardsort_block | image_block | mixed)
* config
* order_index
* is_required
* version

### Session

* _id
* user_id
* study_id
* module_type
* started_at
* completed_at
* status (in_progress | done)

### Question

* _id
* study_id
* text
* type
* options[]
* required
* version

### Answer

* session_id
* question_id
* response
* created_at

### CardSort

* session_id
* version
* card_groups (Array mit group_name + card_ids[])

### Card

* _id
* study_id
* label
* description (optional)
* version

### ImageRating

* session_id
* image_id
* rating
* feedback
* recall_answer (optional)

### ImageAsset

* _id
* study_id
* filename/path
* meta (alt_text, category)
* version

### User

* _id
* name
* created_at

### Session

* _id
* user_id
* module_type
* started_at
* completed_at

### Answer

* session_id
* question_id
* response

### CardSort

* session_id
* card_groups

### ImageRating

* session_id
* image_id
* rating
* feedback

---

## 10. Erfolgskriterien

* Mehrere Nutzer können parallel arbeiten
* Sessions sind reproduzierbar
* Daten sind strukturiert exportierbar
* Vergleichsanalysen möglich
* Für jede Studie existiert eine visuelle Study-Übersicht (Dashboard)
* Für jede teilnehmende Person existiert eine visuelle User-Detailauswertung
* Einsatz im Projektbericht dokumentierbar

---

## 11. Bezug zum menschzentrierten Gestaltungsprozess

Die Web-App unterstützt:

* Generativen Research (Interviews, Card Sorting)
* Formativen Research (Bildbewertung, Evaluation)
* Ableitung von User-Need-Statements
* Dokumentation von Evaluationsprozessen

Damit ermöglicht sie die strukturierte Umsetzung des Double-Diamond-Modells:

* Entdecken → Interviews & Card Sorting
* Definieren → Clusterbildung
* Entwickeln → Designvarianten
* Evaluieren → Bildtests & Bewertungen

---

## 12. MVP-Definition

Version 1 (MVP) soll enthalten:

* Registrierung + Login (inkl. Passwortregeln)
* Rollenmodell (Admin/User)
* Admin-Panel (Basis): Fragen, Cards, Bilder, Page Tree und Aufgaben über UI konfigurieren
* Nutzer-Session-System (Fortsetzen möglich)
* Fragebogen-Modul
* Card-Sorting-Modul
* Bildbewertungs-Modul
* Basis-Auswertungen (pro Modul) + Export CSV/JSON
* Basis-Dashboard mit Grafiken pro Nutzer:in und pro Studie
* Export ausgewählter Grafiken als PNG
* Gruppierung nach Profilmerkmalen (mind. Alter + 1 Tag-Dimension)
* Anonymisierte Exporte

Erweiterungen (Future Scope):

* Dashboard mit Visualisierungen
* Automatische Clusteranalyse (Card Sorting)
* Projektbericht-Export als PDF/Docx
* Passwort-Reset + E-Mail (optional lokal)
* Erweiterte Studienlogik (A/B-Tests, Randomisierung pro Gruppe)
* Audit-Log und vollständige Version-Historie in UI

Version 1 soll enthalten:

* Nutzer-Session-System
* Fragebogen-Modul
* Card-Sorting-Modul
* Bildbewertungs-Modul
* Basis-Export-Funktion

Erweiterungen (Future Scope):

* Dashboard mit Visualisierungen
* Automatische Clusteranalyse
* Rollenverwaltung
* Admin-Panel

---

## 13. Vision

Die Web-App soll ein integriertes Tool für strukturierte UX-Research-Prozesse werden und langfristig als Lehr- und Forschungswerkzeug im Bereich User Interface Design eingesetzt werden können.
