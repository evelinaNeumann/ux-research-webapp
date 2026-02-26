# MongoDB Kollektionen – Soll- und Ist-Struktur

Dieses Dokument beschreibt die benötigten Collections für den aktuellen Funktionsumfang.

## Pflichtkollektionen (aktiver Stand)
- `users`
- `studies`
- `study_assignments`
- `study_profile_cards`
- `user_study_profiles`
- `questions`
- `cards`
- `image_assets`
- `page_tree_nodes`
- `research_tasks`
- `sessions`
- `answers`
- `card_sorts`
- `image_ratings`
- `analytics_snapshots` (optional)
- `test_groups` (optional / Erweiterung)

## Collections und Zweck
- `users`: Auth + Rollenmodell
- `studies`: Metadaten, Beschreibung, PDF-Briefing, Vererbungsregeln
- `study_assignments`: Zuweisung User <-> Studie
- `study_profile_cards`: 8 Schlüsselwort-Karten je Studie
- `user_study_profiles`: Profilangaben je User je Studie
- `questions`, `cards`, `image_assets`: Modul-Content
- `page_tree_nodes`, `research_tasks`: Struktur/Aufgaben
- `sessions`: Bearbeitungsstatus pro Studie/User
- `answers`, `card_sorts`, `image_ratings`: Research-Ergebnisse
- `analytics_snapshots`: optionales Caching für Analytics

## Wichtige Indexe (Beispiele)
```js
// users
db.users.createIndex({ username: 1 }, { unique: true });
db.users.createIndex({ role: 1 });

// studies
db.studies.createIndex({ is_active: 1 });
db.studies.createIndex({ type: 1 });

// assignments / profiles
db.study_assignments.createIndex({ study_id: 1, user_id: 1 }, { unique: true });
db.study_profile_cards.createIndex({ study_id: 1, order_index: 1 });
db.user_study_profiles.createIndex({ user_id: 1, study_id: 1 }, { unique: true });

// sessions & results
db.sessions.createIndex({ study_id: 1, user_id: 1, completed_at: -1 });
db.sessions.createIndex({ status: 1 });
db.answers.createIndex({ study_id: 1, user_id: 1, created_at: -1 });
db.card_sorts.createIndex({ study_id: 1, user_id: 1, created_at: -1 });
db.image_ratings.createIndex({ study_id: 1, user_id: 1, created_at: -1 });

// optional snapshot cache
db.analytics_snapshots.createIndex({ scope_type: 1, scope_id: 1, generated_at: -1 });
```

## Minimal-Setup für Start
Wenn Neuaufbau ohne Historie:
- `users`, `studies`, `study_assignments`, `study_profile_cards`, `user_study_profiles`
- `questions`, `cards`, `image_assets`
- `sessions`, `answers`, `card_sorts`, `image_ratings`

Danach optional ergänzen:
- `page_tree_nodes`, `research_tasks`, `analytics_snapshots`, `test_groups`
