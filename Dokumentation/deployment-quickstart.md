# Deployment Quickstart

## 1) Voraussetzungen am Server
- Linux-Server mit Docker + Docker Compose Plugin
- Domain zeigt per A/AAAA auf den Server
- Ports 80 und 443 offen

## 2) Projekt auf den Server kopieren
```bash
git clone <repo-url> ux-research-webapp
cd ux-research-webapp
```

## 3) Produktions-ENV anlegen
```bash
cp deploy/.env.production.example deploy/.env.production
```
Dann in `deploy/.env.production` setzen:
- `CLIENT_ORIGIN` (z. B. `https://research-app.info`)
- `APP_DOMAIN` (z. B. `research-app.info`, ohne `https://`)
- `ACME_EMAIL`
- `JWT_SECRET` (lang und zufaellig)
- `ADMIN_BOOTSTRAP_KEY`

Beispiel:
```env
CLIENT_ORIGIN=https://research-app.info
APP_DOMAIN=research-app.info
ACME_EMAIL=you@example.de
MONGO_URI=mongodb://mongo:27017/ux_research_app
JWT_SECRET=<langes-zufalls-secret>
JWT_EXPIRES_IN=8h
ADMIN_BOOTSTRAP_KEY=<nur-fuer-initialen-admin>
```

## 4) Deployment starten
```bash
cd deploy
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

## 5) Health-Check
```bash
docker compose -f docker-compose.prod.yml ps
curl -I https://$APP_DOMAIN
curl https://$APP_DOMAIN/api/health
```

## 6) Logs bei Problemen
```bash
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f web
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f server
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f mongo
```

## 7) Update-Routine
```bash
git pull
cd deploy
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

## 8) DNS und TLS (IONOS/Hetzner)
- DNS-Record `A`: Host `@` -> `SERVER_IPV4`
- Optional `CNAME`: Host `www` -> Hauptdomain (z. B. `research-app.info`)
- Keine IONOS HTTP-Weiterleitung aktivieren (TLS macht Caddy im Container)

TLS-Check:
```bash
curl -I https://research-app.info
```

## 9) Erster Admin-User
```bash
curl -i -X POST https://research-app.info/api/auth/register-admin \
  -H "Content-Type: application/json" \
  --data-raw '{"username":"admin","password":"EinSicheresPasswort123!","bootstrapKey":"<ADMIN_BOOTSTRAP_KEY>"}'
```

Nach erfolgreichem `201`:
- `ADMIN_BOOTSTRAP_KEY` in `.env.production` sofort rotieren oder entwerten.
- Danach:
```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d
```

## 10) Backup (einfacher Start)
Mongo-Dump (manuell):
```bash
docker exec uxapp-mongo sh -c 'mongodump --archive' > mongo-backup-$(date +%F).archive
```

## 11) Troubleshooting (aus realem Go-Live)
- `405` bei `POST /api/auth/login`:
  - Ursache: API-Proxy in Caddy nicht korrekt gematcht.
  - Fix: `@api path /api*` + `uri strip_prefix /api`.
- `npm install` Fehler `EAI_AGAIN registry.npmjs.org`:
  - Ursache: DNS-Aufloesung aus Docker.
  - Fix: `/etc/docker/daemon.json` setzen:
    ```json
    { "dns": ["1.1.1.1", "8.8.8.8"] }
    ```
  - Danach `systemctl restart docker`.
- Warnings wie `MONGO_URI variable is not set`:
  - Compose-Aufruf ohne `--env-file .env.production` oder fehlerhafte `.env.production`.

## 12) Wichtige Hinweise
- Cookies laufen in Produktion mit `secure=true`.
- Frontend nutzt im Deployment `VITE_API_BASE=/api` und geht ueber Caddy-Proxy auf den Server.
- Uploads und DB sind als Docker Volumes persistent.
