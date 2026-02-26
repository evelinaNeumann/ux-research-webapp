# Systemkontext & Screenflow

# UX Research & Evaluation Web App

---

# 1. Systemkontext

## 1.1 Überblick

Die UX Research Web App ist eine lokal betriebene Anwendung zur Durchführung und Auswertung nutzerzentrierter Research-Methoden.

Das System besteht aus:

* Frontend (React)
* Backend (Node.js + Express)
* Lokale MongoDB-Datenbank

Alle Komponenten laufen lokal auf einem Server oder Entwicklungsrechner.

---

## 1.2 Systemgrenzen

### Innerhalb des Systems

* Benutzerregistrierung & Login
* Rollenverwaltung (Admin / User)
* Studienkonfiguration
* Durchführung von:

  * Fragebögen
  * Card Sorting
  * Bildbewertung
* Datenspeicherung
* Analyse, Visualisierung & Export

### Außerhalb des Systems

* Kein Cloud-Hosting
* Keine externe API
* Keine Drittanbieter-Authentifizierung
* Kein externer Tracking-Service

---

## 1.3 Akteure

### 1️⃣ Teilnehmer:in (User)

* Registriert sich
* Meldet sich an
* Nimmt an Studien teil
* Beantwortet Fragen
* Führt Card Sorting durch
* Bewertet Bilder

### 2️⃣ Admin (Researcher)

* Konfiguriert Studien
* Verwaltet alle research-relevanten Inhalte vollständig über UI
* Definiert Testgruppen
* Führt Auswertungen durch
* Exportiert Ergebnisse

---

## 1.4 Datenfluss (High-Level)

User → React Frontend → Express API → MongoDB

Admin → React Admin Panel → Express API → MongoDB

MongoDB → Express → React (für Auswertung & Visualisierung)

---

# 2. Screenflow – Teilnehmer (User)

## 2.1 Erstzugriff

Startseite
→ Registrierung
→ Login
→ Dashboard

---

## 2.2 Dashboard

Dashboard zeigt:

* Zugewiesene Studien
* Status (Neu / In Bearbeitung / Abgeschlossen)
* Button „Fortsetzen“ oder „Starten"

---

## 2.3 Studienablauf (Beispiel Mixed Study)

Dashboard
→ Profil-/Gruppenabfrage (optional)
→ Modul 1: Fragebogen
→ Modul 2: Card Sorting
→ Modul 3: Bildbewertung
→ Abschlussseite
→ Bestätigung

Session wird gespeichert.

---

## 2.4 Card Sorting Flow

Einführung
→ Karten anzeigen
→ Drag & Drop Gruppierung
→ Gruppennamen vergeben
→ Bestätigen
→ Speicherung

---

## 2.5 Bildbewertung Flow

Einführung
→ Bildanzeige (Timer 5 Sekunden)
→ Bewertungsmaske
→ Offenes Feedback
→ Speicherung

---

# 3. Screenflow – Admin

## 3.1 Admin Login

Login
→ Admin Dashboard

---

## 3.2 Admin Dashboard

Übersicht:

* Aktive Studien
* Anzahl Teilnehmer
* Schnellzugriff Auswertung

---

## 3.3 Studienverwaltung

Admin Dashboard
→ Studienübersicht
→ Studie erstellen / bearbeiten
→ Module konfigurieren
→ Version speichern
→ Aktivieren

---

## 3.3.1 Content Studio (zentrale Inhaltsverwaltung)

Admin Dashboard
→ Content Studio öffnen
→ Fragen / Cards / Bilder / Page Tree / Aufgaben wählen
→ Inhalt anlegen oder ändern
→ Vorschau prüfen
→ Version speichern / veröffentlichen

---

## 3.4 Fragenverwaltung

Admin Dashboard
→ Fragenkatalog
→ Frage hinzufügen
→ Fragetyp definieren
→ Speichern

---

## 3.5 Card-Management

Admin Dashboard
→ Kartenverwaltung
→ Karten hinzufügen / bearbeiten
→ Studie zuweisen

---

## 3.6 Bildverwaltung

Admin Dashboard
→ Bilder hochladen
→ Studie zuweisen
→ Zeitlimit definieren

---

## 3.6.1 Page Tree & Aufgabenverwaltung

Admin Dashboard
→ Page Tree verwalten (Seitenhierarchie)
→ Aufgaben anlegen (pro Seite/Modul)
→ Reihenfolge ändern
→ Speichern

---

## 3.7 Auswertung & Analyse

Admin Dashboard
→ Auswertung wählen
→ Perspektive wählen (User View / Study View)
→ Filter wählen:

* Testgruppe
* Alter
* Interessen
* Zeitraum
* Studienversion
  → Ergebnis anzeigen
  → Diagramm anzeigen (Balken / Linie / Radar / Heatmap)
  → Export (CSV / JSON / PNG)

---

# 4. Sicherheitsfluss

Registrierung:

* Passwort wird gehasht gespeichert

Login:

* Passwortvergleich via Hash
* Session-Token generieren

Admin-Bereich:

* Rollenprüfung bei jedem API-Call

---

# 5. UX-Prinzipien im Screenflow

* Klare Trennung zwischen Admin und User
* Progressive Disclosure bei Studien
* Minimierung kognitiver Last
* Autosave bei Modulen
* Sichtbarer Fortschrittsindikator

---

# 6. Erweiterbarkeit

Zukünftige Erweiterungen:

* A/B-Test Modul
* Vergleich mehrerer Studien
* Projektbericht-Export direkt als Dokument

---

# 7. Zusammenfassung

Der Screenflow unterstützt den vollständigen Research-Prozess:

Entdecken → Interviews & Card Sorting
Definieren → Struktur-Cluster
Entwickeln → Designvarianten
Evaluieren → Bildtests & Bewertungen

Das System ist modular aufgebaut und ermöglicht parallele Mehrnutzer-Studien bei lokaler Datenspeicherung.
