# Server Operations Runbook

Dieses Dokument beschreibt den laufenden Betrieb der produktiven Instanz (`research-app.info`) auf Hetzner.

## 1) System- und Pfad-Referenz
- Server: Ubuntu 24.04 LTS
- App-Pfad: `/opt/ux-research-webapp`
- Deployment-Pfad: `/opt/ux-research-webapp/deploy`
- Compose-Datei: `deploy/docker-compose.prod.yml`
- Env-Datei: `deploy/.env.production`
- Services/Container:
  - `uxapp-web` (Caddy + Frontend)
  - `uxapp-server` (Node/Express API)
  - `uxapp-mongo` (MongoDB)

## 2) Standardbefehle Betrieb
Status:
```bash
cd /opt/ux-research-webapp/deploy
docker compose --env-file .env.production -f docker-compose.prod.yml ps
```

Logs:
```bash
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f web
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f server
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f mongo
```

Neustart:
```bash
docker compose --env-file .env.production -f docker-compose.prod.yml restart
```

## 3) Deployment-Update
```bash
cd /opt/ux-research-webapp
git pull
cd deploy
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

## 4) Health-Checks
```bash
curl -I https://research-app.info
curl https://research-app.info/api/health
```

Erwartung:
- HTTPS erreichbar
- `/api/health` liefert `{"ok":true}`

## 5) Admin-User erstellen (einmalig/bei Bedarf)
```bash
curl -i -X POST https://research-app.info/api/auth/register-admin \
  -H "Content-Type: application/json" \
  --data-raw '{"username":"admin","password":"EinSicheresPasswort123!","bootstrapKey":"<ADMIN_BOOTSTRAP_KEY>"}'
```

Erwartung:
- HTTP `201`

Wichtig:
- Nach Admin-Erstellung `ADMIN_BOOTSTRAP_KEY` rotieren/entwerten und Stack neu laden:
```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d
```

## 6) Nutzer-Rollen verwalten
Nach Login mit Admin-Account in der App:
- Reiter `Benutzer & Rollen`
- Rolle auf `admin` oder `user` setzen

API-Alternative:
- `PUT /api/admin/users/:userId/role`

## 7) Backup und Restore (Basis)
Mongo-Backup:
```bash
docker exec uxapp-mongo sh -c 'mongodump --archive' > /opt/mongo-backup-$(date +%F).archive
```

Uploads sichern:
```bash
docker run --rm -v deploy_uploads_data:/data -v /opt:/backup alpine \
  sh -c 'cd /data && tar czf /backup/uploads-backup-$(date +%F).tar.gz .'
```

## 8) DNS/TLS Betriebsnotizen
- DNS bei IONOS:
  - `A @ -> 178.104.29.235`
  - `CNAME www -> research-app.info` (optional)
- TLS wird automatisch durch Caddy/Let's Encrypt bereitgestellt.
- Zertifikatsmeldungen im `web`-Log sichtbar.

## 9) Bekannte Fehlerbilder und Loesung
`405` auf `POST /api/auth/login`:
- Ursache: falsches API-Routing im Caddyfile.
- Loesung: API-Matcher auf `@api path /api*` und Prefix-Strip aktiv.

`EAI_AGAIN registry.npmjs.org` beim Build:
- Ursache: DNS-Aufloesung im Docker-Umfeld.
- Loesung:
  - `/etc/docker/daemon.json`:
    ```json
    { "dns": ["1.1.1.1", "8.8.8.8"] }
    ```
  - `systemctl restart docker`

Compose-Warnung "variable is not set":
- Ursache: fehlendes `--env-file .env.production` oder unvollstaendige `.env.production`.

## 10) Security-Checkliste Betrieb
- `JWT_SECRET` lang und nicht im Git.
- `ADMIN_BOOTSTRAP_KEY` nach Nutzung rotieren.
- Nur `80/443/22` offen.
- Regelmaessige OS- und Package-Updates.
