# MongoDB Schema Overview (aktueller Stand)

## users
```js
{
  _id,
  username,
  password_hash,
  role,               // 'user' | 'admin'
  created_at,
  updatedAt
}
```

## studies
```js
{
  _id,
  name,
  description,
  type,               // 'questionnaire' | 'card_sort' | 'image_rating' | 'task_work' | 'mixed'
  version,
  is_active,
  assign_to_all_users,
  module_order: [String],
  brief_pdf_path,
  brief_pdf_name,
  profile_cards_source_study_id, // optional
  inherit_profile_cards,         // bool
  inherit_user_profile_points,   // bool
  created_at,
  updatedAt
}
```

## study_assignments
```js
{
  _id,
  study_id,
  user_id,
  assigned_by,
  assigned_at,
  is_active
}
```

## study_profile_cards
```js
{
  _id,
  study_id,
  label,
  order_index,
  is_active
}
```

## user_study_profiles
```js
{
  _id,
  user_id,
  study_id,
  age_range,          // z.B. '20-30'
  role_category,      // 'schueler_azubi_student' | 'angestellter_fachabteilung' | 'leitende_position' | 'other'
  role_custom,
  key_points: [String],
  completed_at
}
```

## sessions
```js
{
  _id,
  user_id,
  study_id,
  study_version,
  module_type,
  current_module,
  status,             // 'in_progress' | 'done'
  started_at,
  completed_at,
  duration_seconds,
  createdAt,
  updatedAt
}
```

## questions
```js
{
  _id,
  study_id,
  text,
  type,
  options: [],
  required,
  version
}
```

## cards
```js
{
  _id,
  study_id,
  label,
  description,
  version
}
```

## image_assets
```js
{
  _id,
  study_id,
  path,
  alt_text,
  category,
  version,
  uploaded_at
}
```

## page_tree_nodes
```js
{
  _id,
  study_id,
  parent_id,
  title,
  node_type,
  order_index,
  is_active,
  version
}
```

## research_tasks
```js
{
  _id,
  study_id,
  page_node_id,
  title,
  description,
  task_type,
  config: {
    interactive: {
      enabled,
      selectable_ids: [String],
      correct_ids: [String],
      file_path
    }
  },
  steps: [{
    prompt,
    order_index,
    correct_ids: [String],
    time_limit_sec
  }],
  content_format,      // 'none' | 'pdf' | 'html'
  attachment_path,
  attachment_name,
  attachment_mime,
  attachments: [{ path, name, mime, format, uploaded_at }],
  order_index,
  is_required,
  version
}
```

## task_responses
```js
{
  _id,
  session_id,
  user_id,
  study_id,
  task_id,
  step_index,
  selected_ids: [String],
  is_correct,
  result_status,      // 'correct' | 'incorrect'
  timed_out,
  timeout_note,
  created_at,
  updated_at
}
```

## answers
```js
{
  _id,
  session_id,
  user_id,
  study_id,
  question_id,
  response,
  created_at
}
```

## card_sorts
```js
{
  _id,
  session_id,
  user_id,
  study_id,
  card_groups: [{ group_name, card_ids: [] }],
  created_at
}
```

## image_ratings
```js
{
  _id,
  session_id,
  user_id,
  study_id,
  image_id,
  rating,
  feedback,
  recall_answer,
  created_at
}
```

## analytics_snapshots (optional)
```js
{
  _id,
  scope_type,
  scope_id,
  filters,
  chart_type,
  payload,
  generated_at
}
```

## Wichtige Indexe
- `users`: `{ username: 1 }` unique
- `studies`: `{ is_active: 1 }`, `{ type: 1 }`
- `sessions`: `{ study_id: 1, user_id: 1, completed_at: -1 }`
- `answers`: `{ study_id: 1, user_id: 1, created_at: -1 }`
- `image_ratings`: `{ study_id: 1, user_id: 1, created_at: -1 }`
- `study_profile_cards`: `{ study_id: 1, order_index: 1 }`
- `user_study_profiles`: `{ user_id: 1, study_id: 1 }` unique
- `research_tasks`: `{ study_id: 1, page_node_id: 1, order_index: 1 }`
- `task_responses`: `{ session_id: 1, task_id: 1, step_index: 1 }` unique
- `task_responses`: `{ study_id: 1, user_id: 1, updated_at: -1 }`
- `analytics_snapshots`: `{ scope_type: 1, scope_id: 1, generated_at: -1 }`
