# Systemkontext & Screenflow

# UX Research & Evaluation Web App

---

# 1. Systemkontext

Die UX Research Web App ist eine serverbasierte Webanwendung zur Durchführung nutzerzentrierter Studien im Mehrnutzerbetrieb.

## Systemkomponenten

* React Frontend
* Node.js / Express Backend
* MongoDB Datenbank
* Reverse Proxy (z. B. Nginx)
* HTTPS (TLS)

---

# 2. Systemgrenzen

## Innerhalb des Systems

* Registrierung & Login
* Rollenverwaltung (Admin / User)
* Studienkonfiguration
* Vollständige Admin-Inhaltsverwaltung über UI (Fragen, Cards, Bilder, Page Tree, Aufgaben)
* Durchführung von Studien
* Datenspeicherung
* Analyse, Visualisierung & Export

## Außerhalb des Systems

* Keine Drittanbieter-Authentifizierung
* Keine externe Tracking-Dienste

---

# 3. Betriebsarchitektur

## Entwicklungsphase

* Lokale Umgebung

## Produktionsbetrieb

* Deployment auf Server oder VPS
* Zugriff über HTTPS
* Node.js Prozessmanager (z. B. PM2)
* MongoDB nur intern erreichbar

---

# 4. Datenfluss (Produktionsbetrieb)

User → HTTPS → Reverse Proxy → Express API → MongoDB

Admin → HTTPS → Reverse Proxy → Express API → MongoDB

MongoDB → Express → React (für Auswertungen und Diagramme)

---

# 5. Auswertungs- und Visualisierungsstack

* Aggregation im Backend über MongoDB-Pipelines (User View / Study View)
* API liefert standardisierte Chart-Payloads (`labels`, `series`, `filters_applied`)
* Frontend rendert Diagramme (Balken, Linie, Radar, Heatmap, Verteilung)
* Diagrammexport als PNG für Projektbericht
* Frontend-Struktur: komponentenbasiert; pro zentraler Komponente eine eigene CSS-Datei (oder CSS Module)
* Designvorgabe: modern, neutral, mit Akzentfarben nur gezielt eingesetzt
* Maximaler Akzentfarbenanteil in der UI: 8%

---

# 6. Screenflow – Teilnehmer

Startseite
→ Registrierung / Login
→ Dashboard
→ Studie starten / fortsetzen
→ Module (Fragebogen → Card Sorting → Bildtest)
→ Abschluss

Session-Daten werden serverseitig gespeichert.

---

# 7. Screenflow – Admin

Admin Login
→ Admin Dashboard
→ Studienverwaltung
→ Content Studio (Fragen/Cards/Bilder/Page Tree/Aufgaben)
→ Auswertung & Filter
→ User View / Study View
→ Export (CSV / JSON / PNG)

---

# 8. Sicherheitsfluss

Registrierung:

* Passwort wird gehasht gespeichert

Login:

* JWT wird erzeugt
* Speicherung im HTTP-only Cookie

API-Zugriff:

* Middleware prüft Token
* Rollenprüfung

Datenbank:

* Nicht öffentlich erreichbar
* Zugriff nur vom Backend-Server

---

# 9. Sicherheitsprinzipien

* HTTPS only
* Least Privilege Prinzip
* Rollenbasierte Zugriffskontrolle
* Rate Limiting
* Schutz vor Brute Force
* Pseudonymisierung
* Anonymisierte Exporte

---

# 10. Zusammenfassung

Das System ist für den produktiven Mehrnutzerbetrieb konzipiert und gewährleistet:

* Sicheren Netzwerkzugriff
* Datenschutzkonforme Speicherung
* Reproduzierbare Studienauswertung
* Trennung von Admin- und User-Bereich

Die Architektur unterstützt die strukturierte Durchführung aller Phasen des UX-Research-Prozesses im serverbasierten Deployment.
