# Deployment & Infrastructure

## Prerequisites

- Docker and Docker Compose installed
- Port 5699 available on the host machine
- (Optional) Port 5432 available if you need direct database access

## Quick Start

1. **Clone the repository**:
   ```bash
   git clone <repo-url>
   cd service-tracker
   ```

2. **Copy environment file**:
   ```bash
   cp .env.example .env
   ```

3. **Edit `.env`** — change `POSTGRES_PASSWORD` and `SECRET_KEY` for production use.

4. **Start all services**:
   ```bash
   docker compose up -d --build
   ```

5. **Access the application**: Open `http://localhost:5699` in a browser.

On first startup, the backend will:
- Run all Alembic migrations to create the database schema
- Seed the `app_settings` row with default values
- Generate VAPID keys for push notifications if not already set

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `POSTGRES_USER` | `servicetracker` | Database username |
| `POSTGRES_PASSWORD` | `changeme` | Database password |
| `POSTGRES_DB` | `servicetracker` | Database name |
| `DATABASE_URL` | `postgresql+asyncpg://...@db:5432/...` | Async connection string |
| `DATABASE_URL_SYNC` | `postgresql://...@db:5432/...` | Sync connection string (migrations) |
| `SECRET_KEY` | `change-this-to-a-random-string` | Application secret |
| `UPLOADS_DIR` | `/app/uploads` | File attachment storage path |
| `VAPID_PRIVATE_KEY` | (empty) | Web Push private key (auto-generated) |
| `VAPID_PUBLIC_KEY` | (empty) | Web Push public key (auto-generated) |
| `VAPID_CLAIMS_EMAIL` | `mailto:admin@example.com` | VAPID certificate email |

## Docker Compose Services

### db (PostgreSQL 16)

- **Image**: `postgres:16-alpine`
- **Volume**: `postgres_data` → `/var/lib/postgresql/data`
- **Health check**: `pg_isready` every 5 seconds
- **Port**: 5432 (exposed for direct access / debugging)

### backend (FastAPI)

- **Build**: `./backend/Dockerfile` (Python 3.12 slim)
- **Entrypoint**: Runs `alembic upgrade head` then `uvicorn --reload`
- **Volumes**:
  - `./backend/app` → `/app/app` (live code reload)
  - `./backend/alembic` → `/app/alembic` (migration sync)
  - `uploads` → `/app/uploads` (file storage)
- **Port**: 8000
- **Depends on**: db (service_healthy)

### cron (Notification Scheduler)

- **Build**: `./cron/Dockerfile` (Alpine 3.19 + curl)
- **Schedule**: Daily at 08:00 UTC
- **Action**: `POST http://backend:8000/api/v1/push/check-notifications`
- **Logs**: Output redirected to container stdout (visible via `docker logs`)
- **Depends on**: backend

### nginx (Reverse Proxy + Frontend)

- **Build**: `./nginx/Dockerfile` (multi-stage: Node 20 → Nginx Alpine)
- **Stage 1**: Builds React frontend (`npm ci && npm run build`)
- **Stage 2**: Copies build output + nginx config
- **Port**: 5699 (host) → 80 (container)
- **Depends on**: backend

## Nginx Configuration

### Routing Rules

| Location | Behavior | Cache |
|----------|----------|-------|
| `/api/` | Proxy to backend:8000 | No cache |
| `/docs`, `/openapi.json` | Proxy to backend (Swagger UI) | No cache |
| `/uploads/` | Serve from `/app/uploads/` | 30 days, immutable |
| `/sw.js` | Serve service worker | No cache, no store, must-revalidate |
| `/manifest.json` | Serve PWA manifest | No cache |
| `*.js, *.css, *.png, ...` | Serve static assets | 1 year, immutable |
| `/` (fallback) | SPA fallback to `/index.html` | Default |

### Proxy Headers

All `/api/` requests forward: `Host`, `X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto`.

### Upload Limit

`client_max_body_size 10M` — matches the backend's 10 MB file size limit.

## Backup

### Using the backup script

```bash
./scripts/backup.sh [backup_directory]
```

Default backup directory: `./backups/`

The script:
1. Reads database credentials from `.env`
2. Creates a timestamped directory
3. Dumps the database via `docker exec db pg_dump`
4. Copies uploaded files from the backend container
5. Compresses everything into a `.tar.gz` archive
6. Cleans up the temporary directory

**Output**: `./backups/service-tracker-backup-YYYYMMDD_HHMMSS.tar.gz`

### Manual backup via API

The `/api/v1/export` endpoint returns all data as JSON:

```bash
curl http://localhost:5699/api/v1/export > backup.json
```

This includes all vehicles with nested oil changes, service records, interval items, and observations, plus app settings. It does not include uploaded files.

### Restoring from backup

1. Extract the archive:
   ```bash
   tar xzf service-tracker-backup-*.tar.gz
   ```

2. Restore the database:
   ```bash
   docker exec -i service-tracker-db-1 psql -U servicetracker servicetracker < database.sql
   ```

3. Restore uploads:
   ```bash
   docker cp uploads/. service-tracker-backend-1:/app/uploads/
   ```

## Data Import

For migrating from an Excel spreadsheet:

```bash
docker exec service-tracker-backend-1 python scripts/import_spreadsheet.py /path/to/file.xlsx
```

The import script:
- Is idempotent (checks for existing records before inserting)
- Parses 5 sheets: Truck Details, Oil Changes, Other Services, Interval Tracking, Misc - Observations
- Handles messy data (N/A, Unknown, various date formats)
- Creates a vehicle from the first sheet, then imports all related records

## Production Considerations

### Security

- **Change default passwords**: Update `POSTGRES_PASSWORD` and `SECRET_KEY` in `.env`
- **Network access**: The app has no authentication; restrict access via VPN, firewall, or reverse proxy with auth
- **HTTPS**: Place behind a reverse proxy with TLS (e.g., Caddy, Traefik, or nginx with certbot)

### Performance

- **Disable reload**: Remove `--reload` from `entrypoint.sh` for production
- **Connection pooling**: The default SQLAlchemy pool settings are suitable for single-user; adjust `pool_size` if needed
- **Static assets**: Nginx serves frontend assets with long-lived cache headers; Vite's content-hashed filenames ensure cache busting on updates

### Monitoring

- **Container logs**: `docker compose logs -f [service]`
- **Cron output**: `docker compose logs cron`
- **Database**: Connect directly via port 5432 or use `docker exec db psql`
- **API docs**: Available at `http://localhost:5699/docs` (Swagger UI)

### Updating

```bash
git pull
docker compose up -d --build
```

The backend entrypoint runs `alembic upgrade head` on every start, so database migrations are applied automatically.
