#!/usr/bin/env bash
# Allow unbound variables - Railway may not set all vars immediately
set +u
set -eo pipefail

# -----------------------------------------------------------------------------
# Set defaults for Railway/deployment - handle both PGHOST and POSTGRES_HOST
# -----------------------------------------------------------------------------
# Railway uses PGHOST, we use POSTGRES_HOST - support both
if [ -n "${PGHOST:-}" ]; then
  export POSTGRES_HOST="${PGHOST}"
elif [ -z "${POSTGRES_HOST:-}" ]; then
  export POSTGRES_HOST="db"
fi

if [ -n "${PGPORT:-}" ]; then
  export POSTGRES_PORT="${PGPORT}"
elif [ -z "${POSTGRES_PORT:-}" ]; then
  export POSTGRES_PORT="5432"
fi

if [ -n "${PGUSER:-}" ]; then
  export POSTGRES_USER="${PGUSER}"
elif [ -z "${POSTGRES_USER:-}" ]; then
  export POSTGRES_USER="postgres"
fi

if [ -n "${PGDATABASE:-}" ]; then
  export POSTGRES_DB="${PGDATABASE}"
elif [ -z "${POSTGRES_DB:-}" ]; then
  export POSTGRES_DB="lbsdb"
fi

if [ -n "${PGPASSWORD:-}" ]; then
  export POSTGRES_PASSWORD="${PGPASSWORD}"
elif [ -z "${POSTGRES_PASSWORD:-}" ]; then
  export POSTGRES_PASSWORD=""
fi

# -----------------------------------------------------------------------------
# Wait for Postgres to be reachable
# -----------------------------------------------------------------------------
echo "Waiting for Postgres at ${POSTGRES_HOST}:${POSTGRES_PORT}..."
# Supabase requires SSL - detect if host contains supabase.co
if echo "${POSTGRES_HOST}" | grep -q "supabase.co"; then
    echo "Detected Supabase - using SSL connection..."
    # Use connection string format with SSL for Supabase
    CONN_STRING="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}?sslmode=require"
    echo "Testing connection (this may take a moment)..."
    MAX_ATTEMPTS=30
    ATTEMPT=0
    until PGPASSWORD="${POSTGRES_PASSWORD}" psql "${CONN_STRING}" -c "SELECT 1;" >/dev/null 2>&1; do
        ATTEMPT=$((ATTEMPT + 1))
        if [ $ATTEMPT -ge $MAX_ATTEMPTS ]; then
            echo "ERROR: Could not connect to Supabase after $MAX_ATTEMPTS attempts"
            echo "Check:"
            echo "  1. Password is correct in Railway variables"
            echo "  2. Supabase project is active"
            echo "  3. Network/firewall allows connections"
            echo "Trying one more time with verbose output..."
            PGPASSWORD="${POSTGRES_PASSWORD}" psql "${CONN_STRING}" -c "SELECT 1;" 2>&1 || true
            exit 1
        fi
        echo "Attempt $ATTEMPT/$MAX_ATTEMPTS - Still waiting for connection..."
        sleep 2
    done
else
    until pg_isready -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" >/dev/null 2>&1; do
        sleep 1
    done
fi
echo "Postgres is ready."

# -----------------------------------------------------------------------------
# Enable PostGIS extension (Azure/Supabase/Neon have it, Railway needs template)
# -----------------------------------------------------------------------------
echo "Enabling PostGIS extension..."
# Use SSL for Supabase connections
if echo "${POSTGRES_HOST}" | grep -q "supabase.co"; then
    CONN_STRING="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}?sslmode=require"
    PGPASSWORD="${POSTGRES_PASSWORD}" psql "${CONN_STRING}" -c "CREATE EXTENSION IF NOT EXISTS postgis;" 2>&1 || {
        echo "WARNING: Could not enable PostGIS extension."
        echo "For Supabase: PostGIS should be pre-installed. Check SQL Editor in Supabase dashboard."
        echo "Continuing anyway - migrations may fail if PostGIS is required..."
    }
else
    PGPASSWORD="${POSTGRES_PASSWORD}" psql -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -c "CREATE EXTENSION IF NOT EXISTS postgis;" 2>&1 || {
        echo "WARNING: Could not enable PostGIS extension."
        echo "For Azure: Enable PostGIS in Server Parameters first, then restart."
        echo "For Railway: Use PostGIS template from https://railway.com/template/postgis"
        echo "Continuing anyway - migrations may fail if PostGIS is required..."
    }
fi

# -----------------------------------------------------------------------------
# Django setup - Run migrations up to 0006 first, then check for created_at
# -----------------------------------------------------------------------------
echo "=========================================="
echo "Running migrations up to 0006 first..."
echo "=========================================="
python manage.py migrate places 0006 --noinput 2>&1 || {
    echo "Warning: Could not migrate to 0006, continuing anyway..."
}

echo "Checking if created_at column exists..."
# Check if created_at column exists in places_event - if so, fake migration 0007
if echo "${POSTGRES_HOST}" | grep -q "supabase.co\|pooler.supabase.com"; then
    CONN_STRING="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}?sslmode=require"
    CREATED_AT_EXISTS=$(PGPASSWORD="${POSTGRES_PASSWORD}" psql "${CONN_STRING}" -tAc "SELECT 1 FROM information_schema.columns WHERE table_name='places_event' AND column_name='created_at'" 2>&1 || echo "0")
else
    CREATED_AT_EXISTS=$(PGPASSWORD="${POSTGRES_PASSWORD}" psql -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -tAc "SELECT 1 FROM information_schema.columns WHERE table_name='places_event' AND column_name='created_at'" 2>&1 || echo "0")
fi
if echo "$CREATED_AT_EXISTS" | grep -q "1"; then
    echo "*** created_at column EXISTS - FAKING migration 0007 NOW before running remaining migrations ***"
    python manage.py migrate places 0007 --fake --noinput 2>&1 || echo "Warning: Could not fake migration 0007"
fi
echo "=========================================="

# Run remaining migrations (0007 should be faked if created_at exists)
echo "Running remaining migrations..."
python manage.py migrate --noinput 2>&1 | tee /tmp/migrate.log
MIGRATE_EXIT=$?
if [ $MIGRATE_EXIT -ne 0 ]; then
    if grep -q "column.*already exists\|DuplicateColumn\|created_at.*already exists" /tmp/migrate.log 2>/dev/null; then
        echo "ERROR: Migration failed with duplicate column error (created_at)"
        echo "Force faking migration 0007 and retrying..."
        python manage.py migrate places 0007 --fake --noinput 2>/dev/null || true
        echo "Retrying migrations after faking 0007..."
        python manage.py migrate --noinput 2>&1 | tee /tmp/migrate2.log
        MIGRATE2_EXIT=$?
        if [ $MIGRATE2_EXIT -ne 0 ]; then
            echo "Migrations still failing after fake. Check logs:"
            cat /tmp/migrate2.log
            exit $MIGRATE2_EXIT
        fi
    else
        echo "Migration failed with different error:"
        cat /tmp/migrate.log
        exit $MIGRATE_EXIT
    fi
fi
python manage.py collectstatic --noinput

# Optional demo health URL ping (won't fail the container if it 404s)
# python manage.py check || true

# -----------------------------------------------------------------------------
# Run Gunicorn (this MUST be `exec` so it becomes PID 1 and keeps the container alive)
# -----------------------------------------------------------------------------
# Railway uses $PORT, Docker Compose uses 8000
PORT="${PORT:-8000}"
exec gunicorn config.wsgi:application \
  --bind 0.0.0.0:${PORT} \
  --workers 3 \
  --timeout 120 \
  --access-logfile - \
  --error-logfile -
