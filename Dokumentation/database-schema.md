
# database-schema.md
# MongoDB Schema Overview

## User
{
  _id,
  username,
  password_hash,
  role,
  created_at
}

## Profile
{
  _id,
  user_id,
  age_group,
  interests: [],
  needs: [],
  test_group_id
}

## Study
{
  _id,
  name,
  type,
  version,
  is_active
}

## Session
{
  _id,
  user_id,
  study_id,
  study_version,
  module_type,
  status,
  started_at,
  completed_at,
  duration_seconds
}

## Question
{
  _id,
  study_id,
  text,
  type,
  options: [],
  required,
  version
}

## Card
{
  _id,
  study_id,
  label,
  description,
  version
}

## ImageAsset
{
  _id,
  study_id,
  path,
  alt_text,
  category,
  version,
  uploaded_at
}

## PageTreeNode
{
  _id,
  study_id,
  parent_id,
  title,
  node_type,      // page | section | task_container
  order_index,
  is_active,
  version
}

## ResearchTask
{
  _id,
  study_id,
  page_node_id,
  title,
  description,
  task_type,      // instruction | question_block | cardsort_block | image_block | mixed
  config: {},
  order_index,
  is_required,
  version
}

## Answer
{
  session_id,
  user_id,
  study_id,
  question_id,
  response,
  created_at
}

## CardSort
{
  session_id,
  user_id,
  study_id,
  card_groups: [
    {
      group_name,
      card_ids: []
    }
  ],
  created_at
}

## ImageRating
{
  session_id,
  user_id,
  study_id,
  image_id,
  rating,
  feedback,
  created_at
}

## AnalyticsSnapshot (optional)
{
  _id,
  scope_type,      // "user" | "study"
  scope_id,        // user_id oder study_id
  filters: {},
  chart_type,      // bar | line | radar | heatmap | distribution
  payload: {},
  generated_at
}

## Empfohlene Indexe
- sessions: { study_id: 1, user_id: 1, completed_at: -1 }
- answers: { study_id: 1, user_id: 1, created_at: -1 }
- image_ratings: { study_id: 1, user_id: 1, created_at: -1 }
- page_tree_nodes: { study_id: 1, parent_id: 1, order_index: 1 }
- research_tasks: { study_id: 1, page_node_id: 1, order_index: 1 }
