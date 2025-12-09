#!/usr/bin/env bash
set -euo pipefail

# -----------------------------------------------------------------------------
# Wait for Postgres to be reachable
# -----------------------------------------------------------------------------
echo "Waiting for Postgres..."
until pg_isready -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" >/dev/null 2>&1; do
  sleep 1
done
echo "Postgres is ready."

# -----------------------------------------------------------------------------
# Django setup
# -----------------------------------------------------------------------------
# Check if places_country table exists (tables were created manually or migration already applied)
if PGPASSWORD="${POSTGRES_PASSWORD}" psql -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -tAc "SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='places_country'" | grep -q 1; then
    echo "Tables already exist, ensuring migration 0007 is marked as applied..."
    # Fake the migration if it hasn't been applied yet
    python manage.py migrate places 0007 --fake --noinput 2>/dev/null || true
fi
# Run all migrations (will skip already applied ones)
python manage.py migrate --noinput
python manage.py collectstatic --noinput

# Optional demo health URL ping (won’t fail the container if it 404s)
# python manage.py check || true

# -----------------------------------------------------------------------------
# Run Gunicorn (this MUST be `exec` so it becomes PID 1 and keeps the container alive)
# -----------------------------------------------------------------------------
exec gunicorn config.wsgi:application \
  --bind 0.0.0.0:8000 \
  --workers 3 \
  --timeout 120 \
  --access-logfile - \
  --error-logfile -
