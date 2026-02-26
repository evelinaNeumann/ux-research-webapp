
# architecture.md
# System Architecture Overview

## High-Level Architecture

Client (Browser)
   ↓ HTTPS
Reverse Proxy (Nginx)
   ↓
Node.js / Express API
   ↓
Content Management Service (Admin UI CRUD + Versioning)
   ↓
Analytics Service (Aggregation + Chart Payload)
   ↓
MongoDB (Internal Network Only)

---

## Security Layers

1. TLS Encryption (HTTPS)
2. JWT Authentication
3. Role-Based Access Control
4. Database Isolation
5. Firewall Rules
6. Rate Limiting

---

## Deployment Stack

- VPS / Dedicated Server
- PM2 Process Manager
- Nginx Reverse Proxy
- MongoDB Internal Instance
- Chart Rendering Library (Frontend)

---

## Scalability

- Horizontal scaling via load balancer
- Stateless API (JWT-based)
- Database indexing
- Write-optimierte Endpunkte für Admin Content Studio (bulk reorder, version publish)
- Aggregations mit vorgefilterten Pipelines (User View / Study View)
- Optional Snapshot-Caching für häufige Dashboard-Abfragen
