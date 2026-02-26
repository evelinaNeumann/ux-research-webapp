# MongoDB Kollektionen – Soll-Struktur

Dieses Dokument beschreibt die notwendigen MongoDB-Kollektionen für die UX Research Web App, auch wenn aktuell noch keine Kollektion existiert.

---

## 1. `users`
Zweck: Authentifizierung und Rollen.

Pflichtfelder:
- `_id`
- `username` (unique)
- `password_hash`
- `role` (`user` | `admin`)
- `created_at`

Empfohlene Indexe:
- `{ username: 1 }` unique
- `{ role: 1 }`

---

## 2. `profiles`
Zweck: Segmentierung für Auswertungen (optional/pseudonymisiert).

Pflichtfelder:
- `_id`
- `user_id` (Ref `users._id`)
- `age_group`
- `interests` (Array)
- `needs` (Array)
- `test_group_id` (Ref `test_groups._id`)

Empfohlene Indexe:
- `{ user_id: 1 }` unique
- `{ test_group_id: 1 }`

---

## 3. `test_groups`
Zweck: Vergleich von Zielgruppen.

Pflichtfelder:
- `_id`
- `name`
- `criteria` (optional Objekt)

Empfohlene Indexe:
- `{ name: 1 }` unique

---

## 4. `studies`
Zweck: Studien-Metadaten und Versionierung.

Pflichtfelder:
- `_id`
- `name`
- `type` (`questionnaire` | `card_sort` | `image_rating` | `mixed`)
- `version`
- `is_active`
- `created_at`

Empfohlene Indexe:
- `{ is_active: 1 }`
- `{ type: 1 }`

---

## 5. `questions`
Zweck: Fragebogen-Inhalte pro Studie.

Pflichtfelder:
- `_id`
- `study_id` (Ref `studies._id`)
- `text`
- `type` (`text_short` | `text_long` | `single_choice` | `multiple_choice` | `likert`)
- `options` (Array, je nach Typ)
- `required` (bool)
- `version`

Empfohlene Indexe:
- `{ study_id: 1, version: -1 }`

---

## 6. `cards`
Zweck: Card-Sorting Items.

Pflichtfelder:
- `_id`
- `study_id` (Ref `studies._id`)
- `label`
- `description` (optional)
- `version`

Empfohlene Indexe:
- `{ study_id: 1, version: -1 }`

---

## 7. `image_assets`
Zweck: Bilddaten für 5-Sekunden-Test/Bildbewertung.

Pflichtfelder:
- `_id`
- `study_id` (Ref `studies._id`)
- `path`
- `alt_text` (optional)
- `category` (optional)
- `version`
- `uploaded_at`

Empfohlene Indexe:
- `{ study_id: 1, version: -1 }`

---

## 8. `page_tree_nodes`
Zweck: Seiten-/Navigationsstruktur pro Studie.

Pflichtfelder:
- `_id`
- `study_id` (Ref `studies._id`)
- `parent_id` (optional, Ref `page_tree_nodes._id`)
- `title`
- `node_type` (`page` | `section` | `task_container`)
- `order_index`
- `is_active`
- `version`

Empfohlene Indexe:
- `{ study_id: 1, parent_id: 1, order_index: 1 }`

---

## 9. `research_tasks`
Zweck: Aufgaben/Instruktionen je Seite/Modul.

Pflichtfelder:
- `_id`
- `study_id` (Ref `studies._id`)
- `page_node_id` (Ref `page_tree_nodes._id`)
- `title`
- `description`
- `task_type` (`instruction` | `question_block` | `cardsort_block` | `image_block` | `mixed`)
- `config` (Objekt)
- `order_index`
- `is_required`
- `version`

Empfohlene Indexe:
- `{ study_id: 1, page_node_id: 1, order_index: 1 }`

---

## 10. `sessions`
Zweck: Sitzungen pro Nutzer und Studie.

Pflichtfelder:
- `_id`
- `user_id` (Ref `users._id`)
- `study_id` (Ref `studies._id`)
- `study_version`
- `module_type`
- `status` (`in_progress` | `done`)
- `started_at`
- `completed_at` (optional)
- `duration_seconds` (optional)

Empfohlene Indexe:
- `{ study_id: 1, user_id: 1, completed_at: -1 }`
- `{ status: 1 }`

---

## 11. `answers`
Zweck: Antworten aus Fragebogen-Modulen.

Pflichtfelder:
- `session_id` (Ref `sessions._id`)
- `user_id` (Ref `users._id`)
- `study_id` (Ref `studies._id`)
- `question_id` (Ref `questions._id`)
- `response`
- `created_at`

Empfohlene Indexe:
- `{ study_id: 1, user_id: 1, created_at: -1 }`
- `{ question_id: 1 }`

---

## 12. `card_sorts`
Zweck: Ergebnisstruktur aus Card Sorting.

Pflichtfelder:
- `session_id` (Ref `sessions._id`)
- `user_id` (Ref `users._id`)
- `study_id` (Ref `studies._id`)
- `card_groups` (Array aus `{ group_name, card_ids[] }`)
- `created_at`

Empfohlene Indexe:
- `{ study_id: 1, user_id: 1, created_at: -1 }`

---

## 13. `image_ratings`
Zweck: Bewertungen und Feedback zu Bildern.

Pflichtfelder:
- `session_id` (Ref `sessions._id`)
- `user_id` (Ref `users._id`)
- `study_id` (Ref `studies._id`)
- `image_id` (Ref `image_assets._id`)
- `rating`
- `feedback` (optional)
- `recall_answer` (optional)
- `created_at`

Empfohlene Indexe:
- `{ study_id: 1, user_id: 1, created_at: -1 }`
- `{ image_id: 1 }`

---

## 14. `analytics_snapshots` (optional)
Zweck: gecachte Dashboard-Daten für schnellere Anzeige.

Pflichtfelder:
- `_id`
- `scope_type` (`user` | `study`)
- `scope_id`
- `filters` (Objekt)
- `chart_type`
- `payload` (Objekt)
- `generated_at`

Empfohlene Indexe:
- `{ scope_type: 1, scope_id: 1, generated_at: -1 }`

---

## Minimaler Start (MVP)
Wenn ihr klein starten wollt, reichen zuerst:
- `users`
- `studies`
- `questions`
- `cards`
- `image_assets`
- `sessions`
- `answers`
- `card_sorts`
- `image_ratings`

Danach schrittweise ergänzen:
- `profiles`, `test_groups`, `page_tree_nodes`, `research_tasks`, `analytics_snapshots`
