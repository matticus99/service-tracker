#!/bin/bash
# Vehicle Service Tracker - Backup Script
# Usage: ./scripts/backup.sh [backup_dir]
#
# Creates a timestamped backup containing:
# 1. PostgreSQL database dump
# 2. Uploads directory archive
#
# Run from the project root (where docker-compose.yml lives).

set -euo pipefail

BACKUP_DIR="${1:-./backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="service-tracker-backup-${TIMESTAMP}"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}"

# Source .env for database credentials
if [ -f .env ]; then
  export $(grep -E '^(POSTGRES_USER|POSTGRES_PASSWORD|POSTGRES_DB)=' .env | xargs)
fi

DB_USER="${POSTGRES_USER:-servicetracker}"
DB_NAME="${POSTGRES_DB:-servicetracker}"

echo "Starting backup: ${BACKUP_NAME}"
mkdir -p "${BACKUP_PATH}"

# 1. Database dump
echo "  Dumping database..."
docker compose exec -T db pg_dump -U "${DB_USER}" "${DB_NAME}" \
  > "${BACKUP_PATH}/database.sql"
echo "  Database dump: $(du -h "${BACKUP_PATH}/database.sql" | cut -f1)"

# 2. Copy uploads
echo "  Archiving uploads..."
docker compose cp backend:/app/uploads "${BACKUP_PATH}/uploads" 2>/dev/null \
  || echo "  (no uploads found)"

# 3. Compress
echo "  Compressing..."
tar -czf "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" -C "${BACKUP_DIR}" "${BACKUP_NAME}"
rm -rf "${BACKUP_PATH}"

echo ""
echo "Backup complete: ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
echo "Size: $(du -h "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" | cut -f1)"
