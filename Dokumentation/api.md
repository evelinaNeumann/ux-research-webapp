
# api.md
# REST API Documentation – UX Research Web App

## Authentication

POST /auth/register
Request:
{
  "username": "string",
  "password": "string"
}

POST /auth/register-admin
Request:
{
  "username": "string",
  "password": "string",
  "bootstrapKey": "string"
}

POST /auth/login
Request:
{
  "username": "string",
  "password": "string"
}

Response:
{
  "accessToken": "JWT"
}

POST /auth/logout
POST /auth/change-password

---

## Studies

GET /studies (Admin: alle, User: nur zugewiesene aktive Studien)
GET /studies/:id
GET /studies/:id/questions
GET /studies/:id/cards
GET /studies/:id/images
GET /studies/:id/profile-cards
POST /studies (Admin)
PUT /studies/:id (Admin)
DELETE /studies/:id (Admin)

---

## Admin Content Management (Admin)

### Questions
GET /admin/studies/:studyId/questions
POST /admin/studies/:studyId/questions
PUT /admin/questions/:questionId
DELETE /admin/questions/:questionId

### Cards
GET /admin/studies/:studyId/cards
POST /admin/studies/:studyId/cards
PUT /admin/cards/:cardId
DELETE /admin/cards/:cardId

### Images
GET /admin/studies/:studyId/images
POST /admin/studies/:studyId/images/upload
PUT /admin/images/:imageId
DELETE /admin/images/:imageId

### Page Tree
GET /admin/studies/:studyId/page-tree
POST /admin/studies/:studyId/page-tree/nodes
PUT /admin/page-tree/nodes/:nodeId
DELETE /admin/page-tree/nodes/:nodeId
PUT /admin/studies/:studyId/page-tree/reorder

### Tasks
GET /admin/studies/:studyId/tasks
POST /admin/studies/:studyId/tasks
PUT /admin/tasks/:taskId
DELETE /admin/tasks/:taskId

### Content Versioning
POST /admin/studies/:studyId/content/publish
POST /admin/studies/:studyId/content/rollback

### User Role Management
GET /admin/users
GET /admin/users/:userId/profiles
PUT /admin/users/:userId/profiles/:studyId
PUT /admin/users/:userId/role
DELETE /admin/users/:userId

### Study Assignments
GET /admin/studies/:studyId/assignments
POST /admin/studies/:studyId/assignments
DELETE /admin/studies/:studyId/assignments/:userId

### Study Profile Cards
GET /admin/studies/:studyId/profile-cards
POST /admin/studies/:studyId/profile-cards
PUT /admin/profile-cards/:cardId
DELETE /admin/profile-cards/:cardId

---

## Sessions

POST /sessions (User nur nach abgeschlossenem Study-Profil)
GET /sessions/:id
PUT /sessions/:id/complete

---

## User Study Profile

GET /profiles/options
GET /profiles/me
GET /profiles/study/:studyId
PUT /profiles/study/:studyId

---

## Answers

POST /answers
GET /answers/session/:sessionId

---

## Card Sorting

POST /cardsort
GET /cardsort/session/:sessionId

---

## Image Ratings

POST /image-rating
GET /image-rating/session/:sessionId

---

## Analytics (Admin)

GET /analytics/overview
GET /analytics/group/:groupId
GET /analytics/study/:studyId
GET /analytics/study/:studyId/charts
GET /analytics/user/:userId
GET /analytics/user/:userId/charts
GET /analytics/compare/users?userIds=u1,u2
GET /analytics/compare/studies?studyIds=s1,s2
POST /analytics/export/chart (PNG)

Beispiel Request:
POST /analytics/export/chart
{
  "scope": "study",
  "scopeId": "studyId",
  "chartType": "bar",
  "filters": {
    "module": "image_rating",
    "dateFrom": "2026-01-01",
    "dateTo": "2026-01-31"
  }
}

All protected routes require valid JWT.
