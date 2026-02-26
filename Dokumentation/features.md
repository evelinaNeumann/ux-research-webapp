# UX Research Web App – Feature Overview (Stand: aktuell)

## Auth & Rollen
- Registrierung, Login, Logout, `me`-Status.
- Passwort-Policy + deutsche Policy-Meldung.
- Auto-Login nach Registrierung.
- Admin-Bootstrap (`/auth/register-admin`).
- Rollenwechsel User/Admin durch Admin.
- Passwortänderung für eigenen Account.
- Schutzregeln: letzter Admin kann nicht entfernt/herabgestuft werden.

## Studien
- Zentrale Studienverwaltung (CRUD) inkl. Beschreibung.
- PDF-Briefing pro Studie (Upload).
- Aktive/Inaktive Studien.
- Studie-Zuweisung an Nutzer.
- Profilkarten-Vererbung von Studie X nach Studie Y.
- Optionales Vorbefüllen der User-Schlüsselwörter aus Quellstudie.

## Admin Content
- Fragen, Cards, Aufgaben, Profilkarten: anlegen/bearbeiten/löschen.
- Bilder-Upload und Verwaltung.
- Page-Tree + Reorder.
- Content-Version erhöhen/rollback pro Studie.

## User Flow
- User sieht nur zugewiesene aktive Studien.
- Vor Start: Profilabfrage (Alter, Rolle, 4 Wörter) je Studie.
- Session fortsetzen solange `in_progress`.
- Nach Abschluss read-only.
- Abschluss nur mit vollständig beantwortetem Interview.

## Dashboard
- Offene Studien (Start/Fortsetzen).
- Bereits bearbeitete Studien separat.
- Studienbeschreibung sichtbar.
- Leere-Zustände mit klaren Hinweisen.

## Analytics (Admin)
- KPI: Teilnahmen, abgeschlossen, Abschlussrate.
- Study-Chart.
- Globaler Filterblock (Alter, Rolle, wichtiges Wort).
- Studienmodule-Reiter (Interview/Card Sorting/Bildauswertung), zuklappbar.
- Interview zeigt Fragetext + alle Antworten einzeln.
- User Portraits + Profil-Daten-Auswertung, zuklappbar.
- Verteilungen als Balkendiagramme.

## Exporte
- Global: CSV/JSON (Overview).
- User Portraits + Profil-Daten-Auswertung: PDF/JSON.
- Studienmodule: PDF/JSON.
- Exporte übernehmen aktive Filter.

## UX/Frontend-Qualität
- Eigene Komponenten + separates CSS.
- Einheitliche Admin-Card-Anordnung (Symmetrie).
- Deutsche Label- und Meldungslogik.
- Erfolg-/Fehlermeldungen bei Speichern/Erstellen.
