# REST API Dokumentation (Stand: aktuell)

## Auth
- `POST /auth/register`
- `POST /auth/register-admin`
- `POST /auth/login`
- `POST /auth/logout`
- `POST /auth/change-password`
- `POST /auth/forgot-password`
- `GET /auth/password-reset-status/:username`
- `POST /auth/reset-password-with-username`
- `GET /auth/me`

## Studies
- `GET /studies`
- `GET /studies/:id`
- `GET /studies/:id/questions`
- `GET /studies/:id/cards`
- `GET /studies/:id/images`
- `GET /studies/:id/profile-cards`
- `POST /studies` (admin)
- `PUT /studies/:id` (admin)
- `DELETE /studies/:id` (admin)
- `POST /studies/:id/brief-pdf` (admin, multipart `file`)
- `POST /studies/:id/profile-cards/import` (admin)

## Sessions
- `POST /sessions`
- `GET /sessions`
- `GET /sessions/:id`
- `PUT /sessions/:id/complete`
  - validiert vollständige Pflichtmodule (inkl. interaktive Aufgaben-Schritte)

## Profiles
- `GET /profiles/options`
- `GET /profiles/me`
- `GET /profiles/study/:studyId`
- `GET /profiles/study/:studyId/prefill`
- `PUT /profiles/study/:studyId`

## Research Data
- `POST /answers`
- `GET /answers/session/:sessionId`
- `POST /cardsort`
- `GET /cardsort/session/:sessionId`
- `POST /image-rating`
- `GET /image-rating/session/:sessionId`
- `POST /task-response`
- `GET /task-response/session/:sessionId`

## Admin Content (`/admin`, admin-only)
### Users
- `GET /admin/users`
- `PUT /admin/users/:userId/role`
- `DELETE /admin/users/:userId`
- `GET /admin/users/:userId/profiles`
- `PUT /admin/users/:userId/profiles/:studyId`
- `GET /admin/users/password-reset-requests`
- `POST /admin/users/:userId/password-reset-decision`

### Assignments
- `GET /admin/studies/:studyId/assignments`
- `POST /admin/studies/:studyId/assignments`
- `DELETE /admin/studies/:studyId/assignments/:userId`

### Profile Cards
- `GET /admin/studies/:studyId/profile-cards`
- `POST /admin/studies/:studyId/profile-cards`
- `PUT /admin/profile-cards/:cardId`
- `DELETE /admin/profile-cards/:cardId`

### Questions
- `GET /admin/studies/:studyId/questions`
- `POST /admin/studies/:studyId/questions`
- `PUT /admin/questions/:questionId`
- `DELETE /admin/questions/:questionId`

### Cards
- `GET /admin/studies/:studyId/cards`
- `POST /admin/studies/:studyId/cards`
- `PUT /admin/cards/:cardId`
- `DELETE /admin/cards/:cardId`

### Images
- `GET /admin/studies/:studyId/images`
- `POST /admin/studies/:studyId/images/upload`
- `PUT /admin/images/:imageId`
- `DELETE /admin/images/:imageId`

### Page Tree
- `GET /admin/studies/:studyId/page-tree`
- `POST /admin/studies/:studyId/page-tree/nodes`
- `PUT /admin/page-tree/nodes/:nodeId`
- `DELETE /admin/page-tree/nodes/:nodeId`
- `PUT /admin/studies/:studyId/page-tree/reorder`

### Tasks
- `GET /admin/studies/:studyId/tasks`
- `POST /admin/studies/:studyId/tasks`
- `PUT /admin/tasks/:taskId`
- `DELETE /admin/tasks/:taskId`
- `POST /admin/tasks/:taskId/attachment` (multipart `files[]`, PDF/HTML, mehrfach)
- `DELETE /admin/tasks/:taskId/attachment` (body: `path`)

### Content Version
- `POST /admin/studies/:studyId/content/publish`
- `POST /admin/studies/:studyId/content/rollback`

## Analytics (`/analytics`, admin-only)
- `GET /analytics/overview`
- `GET /analytics/group/:groupId`
- `GET /analytics/study/:studyId`
- `GET /analytics/study/:studyId/charts`
- `GET /analytics/study/:studyId/user-portraits`
- `GET /analytics/study/:studyId/user-portraits/export?format=json|pdf`
- `GET /analytics/study/:studyId/modules/export?format=json|pdf`
- `GET /analytics/user/:userId`
- `GET /analytics/user/:userId/charts`
- `GET /analytics/compare/users`
- `GET /analytics/compare/studies`
- `GET /analytics/export?format=csv|json`
- `POST /analytics/export/chart` (Scaffold)

## Filter (Analytics)
Die folgenden Query-Filter sind implementiert und wirken auf Analytics/Module-Exports:
- `age`
- `role`
- `keyword`
- zusätzlich: `dateFrom`, `dateTo`, `studyId`, `userId`
