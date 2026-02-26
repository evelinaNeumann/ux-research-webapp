
# features.md
# UX Research & Evaluation Web App – Feature Overview

---

## 1. User Management

### 1.1 Registrierung
- Benutzername + sicheres Passwort
- Passwortregeln (min. 11 Zeichen, Groß-/Kleinbuchstaben, Zahl, Sonderzeichen)
- Passwort darf nicht Bestandteil des Benutzernamens sein
- Passwort-Hashing (Argon2 / bcrypt)

### 1.2 Login
- JWT-basierte Authentifizierung
- Speicherung im HTTP-only Cookie
- Rollenprüfung (User / Admin)
- Rate Limiting & Brute-Force-Schutz

---

## 2. Rollenmodell

### User
- Teilnahme an Studien
- Fortsetzen von Sessions
- Keine Einsicht in Gesamtauswertungen

### Admin
- Verwaltung von Studien
- Vollständige UI-Verwaltung aller research-relevanten Inhalte
- Verwaltung von Fragen, Karten, Bildsets, Page Tree und Aufgaben
- Testgruppenverwaltung
- Auswertungen & Exporte

### 2.1 Admin Content Studio
- Inhalte vollständig über UI erstellbar und änderbar (ohne DB-Eingriff)
- CRUD für Fragen, Cards, Bilder, Seitenstruktur (Page Tree), Aufgaben
- Upload/Ersetzen/Löschen von Medien inkl. Metadaten
- Versionierung und Rollback pro Studie
- Vorschau vor Aktivierung einer Studienversion

---

## 3. Studienmodule

### 3.1 Fragebogen-Modul
- Dynamische Fragetypen (Text, Single Choice, Multiple Choice, Likert-Skala)
- Pflichtfelder
- Versionierung von Fragen
- Speicherung pro Session

### 3.2 Card Sorting Modul
- Drag & Drop Interface
- Open / Closed / Hybrid Sorting
- Gruppennamen definierbar
- Speicherung der finalen Struktur
- Vergleichsaggregation mehrerer Nutzer

### 3.3 Bildbewertungs-Modul
- Bildanzeige mit Timer (z. B. 5 Sekunden)
- Bewertungsskala
- Offenes Feedbackfeld
- Optional Recall-Frage

---

## 4. Testgruppen & Profilmerkmale

- Altersspannen
- Interessen-Tags
- Bedürfnis-/Erfahrungs-Kategorien
- Filterbare Gruppenanalyse
- Vergleich zwischen Gruppen

---

## 5. Analyse & Reporting

### 5.1 Pro Modul
- Häufigkeitsanalyse
- Mittelwerte (Likert-Skalen)
- Gruppenspezifische Filter

### 5.2 Pro Nutzer:in (User View)
- Individuelle Auswertung je Session und je Modul
- Verlaufsgrafiken (z. B. Ratings pro Session/Zeitraum)
- Vergleich Nutzerwert vs. Studiendurchschnitt
- Detailansicht mit zugrunde liegenden Antworten

### 5.3 Pro Studie (Study View)
- Gesamtauswertung über mehrere Module
- Vergleich mehrerer Testgruppen
- Zeitraumbasierte Filter
- Vergleich von Studienversionen
- KPI-Übersicht (Teilnahmen, Abschlussrate, Durchschnitt, Streuung)

### 5.4 Visualisierung
- Dashboard mit Diagrammtypen: Balken, Linie, Radar, Heatmap, Verteilung
- Interaktive Filter (Modul, Zeitraum, Testgruppe, Studienversion)
- Drilldown von Diagramm zu Datentabelle

### 5.5 Export
- CSV
- JSON
- PNG (Diagrammexport für Projektberichte)
- Anonymisierte Datenexporte

---

## 6. Sicherheitsfeatures

- HTTPS only
- Reverse Proxy (Nginx)
- Rollenbasierte Zugriffskontrolle
- Geschützte Admin-Endpunkte
- MongoDB nicht öffentlich erreichbar
- Firewall & Server-Härtung
- Audit-Log für Admin-Aktionen
- Regelmäßige Backups

---

## 7. UX Features

- Fortschrittsanzeige während Studien
- Autosave von Sessions
- Klare Trennung von Admin- & User-UI
- Responsive Design
- Progressive Disclosure
- Separate Komponenten mit separaten CSS-Dateien pro größerem UI-Bereich
- Wartbare Styling-Struktur (komponentenbasiert, geringe globale CSS-Abhängigkeit)
- Moderner, neutraler Look mit gezielten Farbakzenten
- Farbakzentanteil in der Oberfläche: max. 8%

---

## 8. Erweiterbare Features (Future Scope)

- Automatische Clusteranalyse
- A/B-Test-Modul
- PDF-Projektbericht-Export
- Erweiterte Rollen (z. B. Analyst, Dozent)
