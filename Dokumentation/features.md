# UX Research Web App – Feature Overview (Stand: aktuell)

## Auth & Rollen
- Registrierung, Login, Logout, `me`-Status.
- Passwort-Policy + deutsche Policy-Meldung.
- Auto-Login nach Registrierung.
- Admin-Bootstrap (`/auth/register-admin`).
- Rollenwechsel User/Admin durch Admin.
- Passwortänderung für eigenen Account.
- Passwort-vergessen-Prozess mit Admin-Freigabe (`pending` -> `approved/none`).
- Schutzregeln: letzter Admin kann nicht entfernt/herabgestuft werden.

## Studien
- Zentrale Studienverwaltung (CRUD) inkl. Beschreibung.
- PDF-Briefing pro Studie (Upload).
- Aktive/Inaktive Studien.
- Studie-Zuweisung an Nutzer.
- Option `assign_to_all_users` (automatische Zuweisung an bestehende und neue User).
- Profilkarten-Vererbung von Studie X nach Studie Y.
- Optionales Vorbefüllen der User-Schlüsselwörter aus Quellstudie.

## Admin Content
- Fragen, Cards, Aufgaben, Profilkarten: anlegen/bearbeiten/löschen.
- Aufgaben mit mehreren Schritten (geordnet), Schrittbearbeitung (add/edit/delete).
- Optionales Zeitlimit pro Aufgabenschritt.
- Task-Dateien (PDF/HTML): Mehrfach-Upload, Auswahl je Schritt, Einzeldatei-Löschen.
- Bilder-Upload und Verwaltung.
- Page-Tree + Reorder.
- Content-Version erhöhen/rollback pro Studie.

## User Flow
- User sieht nur zugewiesene aktive Studien.
- Vor Start: Profilabfrage (Alter, Rolle, 4 Wörter) je Studie.
- Session fortsetzen solange `in_progress`.
- Nach Abschluss read-only.
- Abschluss nur mit vollständig bearbeiteten Pflichtmodulen.
- Aufgabenmodul:
  - nur eine Aufgabe gleichzeitig sichtbar,
  - Schritt-Navigation vor/zurück innerhalb der Aufgabe,
  - Antwortspeicherung direkt per Klick in HTML-Vorschau,
  - Timeout pro Schritt speichert `timed_out` und wechselt automatisch weiter.

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
- Studienmodule-Reiter enthält zusätzlich Aufgabenbearbeitung.
- Interview zeigt Fragetext + alle Antworten einzeln.
- User Portraits + Profil-Daten-Auswertung, zuklappbar.
- Verteilungen als Balkendiagramme.
- Aufgaben-Auswertung:
  - Task + Schrittmetriken,
  - getrennte Zählung `falsch geklickt` vs `Zeit abgelaufen`,
  - Kreisdiagramme in 2er Card-Layout.

## Exporte
- Global: CSV/JSON (Overview).
- User Portraits + Profil-Daten-Auswertung: PDF/JSON.
- Studienmodule: PDF/JSON.
- Exporte übernehmen aktive Filter.
- Aufgaben-Metriken inkl. `falsch geklickt` und `Zeit abgelaufen` in Studienmodule-Export.

## UX/Frontend-Qualität
- Eigene Komponenten + separates CSS.
- Einheitliche Admin-Card-Anordnung (Symmetrie).
- Deutsche Label- und Meldungslogik.
- Erfolg-/Fehlermeldungen bei Speichern/Erstellen.
