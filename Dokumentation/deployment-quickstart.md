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
- `CLIENT_ORIGIN` (z. B. `https://ux-study.example.de`)
- `APP_DOMAIN` (z. B. `ux-study.example.de`)
- `ACME_EMAIL`
- `JWT_SECRET` (lang und zufaellig)
- `ADMIN_BOOTSTRAP_KEY`

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
docker compose -f docker-compose.prod.yml logs -f web
docker compose -f docker-compose.prod.yml logs -f server
docker compose -f docker-compose.prod.yml logs -f mongo
```

## 7) Update-Routine
```bash
git pull
cd deploy
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

## 8) Backup (einfacher Start)
Mongo-Dump (manuell):
```bash
docker exec uxapp-mongo sh -c 'mongodump --archive' > mongo-backup-$(date +%F).archive
```

## 9) Wichtige Hinweise
- Cookies laufen in Produktion mit `secure=true`.
- Frontend nutzt im Deployment `VITE_API_BASE=/api` und geht ueber Caddy-Proxy auf den Server.
- Uploads und DB sind als Docker Volumes persistent.
