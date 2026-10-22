#!/usr/bin/env bash
set -euo pipefail

# FactoryMatch Production Database Backup Script
# Usage: ./infra/scripts/backup.sh
# Scheduled via crontab: 0 2 * * * /app/infra/scripts/backup.sh

BACKUP_DIR="${BACKUP_DIR:-/var/backups/factorymatch}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/factorymatch_db_${TIMESTAMP}.sql.gz"
RETENTION_DAYS="${RETENTION_DAYS:-7}"

mkdir -p "${BACKUP_DIR}"

echo "[INFO] Starting database backup at $(date)..."

# Execute pg_dump inside docker container or direct connection
if docker ps --format '{{.Names}}' | grep -q "factorymatch-postgres"; then
  docker exec factorymatch-postgres-prod pg_dump -U "${POSTGRES_USER:-postgres}" "${POSTGRES_DB:-factorymatch}" | gzip > "${BACKUP_FILE}"
else
  pg_dump "${DATABASE_URL}" | gzip > "${BACKUP_FILE}"
fi

echo "[SUCCESS] Backup written to ${BACKUP_FILE} ($(du -h "${BACKUP_FILE}" | cut -f1))"

# Retention prune
echo "[INFO] Pruning backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -type f -name "factorymatch_db_*.sql.gz" -mtime +"${RETENTION_DAYS}" -delete

echo "[SUCCESS] Backup procedure completed successfully."
