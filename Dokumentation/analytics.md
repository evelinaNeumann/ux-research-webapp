# Analytics & Auswertungslogik (aktuell)

## 1. Quellen
- `sessions`
- `answers`
- `card_sorts`
- `image_ratings`
- `user_study_profiles`
- `questions`
- `research_tasks`
- `task_responses`

## 2. KPI-Logik
- `sessions_total`: Anzahl Sessions im Filterraum.
- `sessions_done`: abgeschlossene Sessions.
- `completion_rate`: `sessions_done / sessions_total * 100`.

## 3. Interview-Logik
- Fragebasis aus `questions` je Studie.
- Antworten werden als letzte Antwort pro `(session_id, question_id)` ausgewertet.
- Ausgabe pro Frage:
  - `question_text`
  - `n` (Anzahl Antworten)
  - `answers[]` (einzeln, inkl. Duplikate)
  - `answer_distribution[]` (für Exportzwecke)

## 4. Modul-Logik
- Card Sorting:
  - `card_sort_submissions` (alle gespeicherten Stände)
  - `latest_session_submissions` (je Session letzter Stand)
  - `column_distribution[]` (Zuordnungen je Spalte)
  - `column_card_distribution[]` (pro Spalte: welche Karten wie häufig)
  - `card_column_distribution[]` (pro Karte: zu welchen Spalten wie häufig)
  - `card_distribution[]` (Häufigkeit je Karte)
  - `user_idea`:
    - `custom_columns_total`
    - `custom_cards_total`
    - `custom_columns_by_name[]`
    - `custom_cards_by_column[]`
    - `custom_cards_by_label[]`
- Bildauswertung: Durchschnitt + N pro Bild.
- Aufgabenbearbeitung:
  - Basis: `research_tasks.steps[]` (Reihenfolge über `order_index`)
  - Antworten: `task_responses` je `(session_id, task_id, step_index)` (unique)
  - Schrittmetriken:
    - `total`
    - `correct`
    - `incorrect_click` (falsch geklickt, ohne Timeout)
    - `timed_out` (Zeit abgelaufen)
    - `incorrect` (= `incorrect_click + timed_out`)
    - `correct_rate`
  - Taskmetriken aggregieren die Schrittmetriken.

## 5. Profilfilter (global für Analytics)
Filter: `age`, `role`, `keyword`
- Filtert zunächst passende User über `user_study_profiles`.
- Danach werden Sessions/Answers/CardSort/ImageRating auf diese User eingeschränkt.
- Wirkt auf:
  - KPI
  - Studienmodule
  - Exporte der Studienmodule

## 6. User Portraits & Profil-Daten
- Endpunkt liefert:
  - Einzelprofile (`items`)
  - Aggregationen (`age_ranges`, `roles`, `key_points`)
- Optional mit `age/role/keyword` filterbar.

## 7. Exporte
### 7.1 Allgemeiner Export
- `GET /analytics/export?format=csv|json`

### 7.2 User Portraits + Profil-Daten
- `GET /analytics/study/:studyId/user-portraits/export?format=json|pdf`
- PDF ist strukturiert (Titel, Metadaten, Abschnitte, Seitenzahlen, Umbruch, Umlaute korrekt)

### 7.3 Studienmodule
- `GET /analytics/study/:studyId/modules/export?format=json|pdf`
- Enthält KPI + Interview + Card Sorting (inkl. Verteilungen/User-Ideen) + Bildauswertung.
- Enthält zusätzlich Aufgabenbearbeitung.
- PDF enthält zusätzlich Diagramme:
  - KPI/Interview/Bildauswertung als Balkendiagramme
- Card-Sorting-Zuordnungen als Kreisdiagramme
- Aufgabenbearbeitung als Kreisdiagramme:
  - pro Task Gesamt korrekt/falsch
  - pro Schritt korrekt/falsch geklickt/Zeit abgelaufen
- JSON enthält zusätzlich ein `charts`-Objekt mit `labels[]` und `series[]` je Diagrammblock.
- Card Sorting im Report enthält zusätzlich `Card -> Spalten` Diagramme (Häufigkeit pro Card und Zielspalte).
- Aufgaben-Reporttext unterscheidet explizit zwischen `falsch geklickt` und `Zeit abgelaufen`.

## 8. Chart Payload
Standardformat:
- `chart_type`
- `labels[]`
- `series[]`
- `filters_applied`
