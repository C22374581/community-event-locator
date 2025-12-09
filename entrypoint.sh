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
# Django setup - Add missing fields/tables from migration 0007 if they don't exist
# -----------------------------------------------------------------------------
echo "=========================================="
echo "Checking and adding missing database fields/tables..."
echo "=========================================="

# Create ALL missing tables and columns from migration 0007
if echo "${POSTGRES_HOST}" | grep -q "supabase.co\|pooler.supabase.com"; then
    CONN_STRING="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}?sslmode=require"
    echo "Creating ALL missing tables and columns from migration 0007..."
    PGPASSWORD="${POSTGRES_PASSWORD}" psql "${CONN_STRING}" <<'EOSQL' 2>&1 || true
-- Add ALL missing columns from migration 0007
DO $$ 
BEGIN
    -- Event table columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='places_event' AND column_name='end_time') THEN
        ALTER TABLE places_event ADD COLUMN end_time TIMESTAMP WITH TIME ZONE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='places_event' AND column_name='price') THEN
        ALTER TABLE places_event ADD COLUMN price NUMERIC(10, 2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='places_event' AND column_name='capacity') THEN
        ALTER TABLE places_event ADD COLUMN capacity INTEGER;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='places_event' AND column_name='recurring') THEN
        ALTER TABLE places_event ADD COLUMN recurring BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='places_event' AND column_name='parent_event_id') THEN
        ALTER TABLE places_event ADD COLUMN parent_event_id BIGINT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='places_event' AND column_name='country_id') THEN
        ALTER TABLE places_event ADD COLUMN country_id BIGINT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='places_event' AND column_name='organizer_id') THEN
        ALTER TABLE places_event ADD COLUMN organizer_id BIGINT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='places_event' AND column_name='created_by_id') THEN
        ALTER TABLE places_event ADD COLUMN created_by_id INTEGER;
    END IF;
    
    -- Route table columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='places_route' AND column_name='country_id') THEN
        ALTER TABLE places_route ADD COLUMN country_id BIGINT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='places_route' AND column_name='elevation_gain') THEN
        ALTER TABLE places_route ADD COLUMN elevation_gain INTEGER;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='places_route' AND column_name='estimated_duration_hours') THEN
        ALTER TABLE places_route ADD COLUMN estimated_duration_hours DOUBLE PRECISION;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='places_route' AND column_name='created_at') THEN
        ALTER TABLE places_route ADD COLUMN created_at TIMESTAMP WITH TIME ZONE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='places_route' AND column_name='updated_at') THEN
        ALTER TABLE places_route ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- Neighborhood table columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='places_neighborhood' AND column_name='country_id') THEN
        ALTER TABLE places_neighborhood ADD COLUMN country_id BIGINT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='places_neighborhood' AND column_name='region_id') THEN
        ALTER TABLE places_neighborhood ADD COLUMN region_id BIGINT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='places_neighborhood' AND column_name='description') THEN
        ALTER TABLE places_neighborhood ADD COLUMN description TEXT;
    END IF;
END $$;
EOSQL
else
    echo "Creating ALL missing tables and columns from migration 0007..."
    PGPASSWORD="${POSTGRES_PASSWORD}" psql -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" <<'EOSQL' 2>&1 || true
-- Add ALL missing columns from migration 0007
DO $$ 
BEGIN
    -- Event table columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='places_event' AND column_name='end_time') THEN
        ALTER TABLE places_event ADD COLUMN end_time TIMESTAMP WITH TIME ZONE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='places_event' AND column_name='price') THEN
        ALTER TABLE places_event ADD COLUMN price NUMERIC(10, 2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='places_event' AND column_name='capacity') THEN
        ALTER TABLE places_event ADD COLUMN capacity INTEGER;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='places_event' AND column_name='recurring') THEN
        ALTER TABLE places_event ADD COLUMN recurring BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='places_event' AND column_name='parent_event_id') THEN
        ALTER TABLE places_event ADD COLUMN parent_event_id BIGINT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='places_event' AND column_name='country_id') THEN
        ALTER TABLE places_event ADD COLUMN country_id BIGINT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='places_event' AND column_name='organizer_id') THEN
        ALTER TABLE places_event ADD COLUMN organizer_id BIGINT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='places_event' AND column_name='created_by_id') THEN
        ALTER TABLE places_event ADD COLUMN created_by_id INTEGER;
    END IF;
    
    -- Route table columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='places_route' AND column_name='country_id') THEN
        ALTER TABLE places_route ADD COLUMN country_id BIGINT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='places_route' AND column_name='elevation_gain') THEN
        ALTER TABLE places_route ADD COLUMN elevation_gain INTEGER;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='places_route' AND column_name='estimated_duration_hours') THEN
        ALTER TABLE places_route ADD COLUMN estimated_duration_hours DOUBLE PRECISION;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='places_route' AND column_name='created_at') THEN
        ALTER TABLE places_route ADD COLUMN created_at TIMESTAMP WITH TIME ZONE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='places_route' AND column_name='updated_at') THEN
        ALTER TABLE places_route ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- Neighborhood table columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='places_neighborhood' AND column_name='country_id') THEN
        ALTER TABLE places_neighborhood ADD COLUMN country_id BIGINT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='places_neighborhood' AND column_name='region_id') THEN
        ALTER TABLE places_neighborhood ADD COLUMN region_id BIGINT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='places_neighborhood' AND column_name='description') THEN
        ALTER TABLE places_neighborhood ADD COLUMN description TEXT;
    END IF;
    
    -- Create Country table if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='places_country') THEN
        CREATE TABLE places_country (
            id BIGSERIAL PRIMARY KEY,
            name VARCHAR(100) UNIQUE NOT NULL,
            code VARCHAR(2) UNIQUE,
            geometry geometry(MultiPolygon, 4326),
            flag_emoji VARCHAR(10),
            created_at TIMESTAMP WITH TIME ZONE
        );
        CREATE INDEX places_coun_geometr_dc69cb_gist ON places_country USING GIST (geometry);
    END IF;
    
    -- Create Region table if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='places_region') THEN
        CREATE TABLE places_region (
            id BIGSERIAL PRIMARY KEY,
            name VARCHAR(120) NOT NULL,
            geometry geometry(MultiPolygon, 4326),
            created_at TIMESTAMP WITH TIME ZONE,
            country_id BIGINT REFERENCES places_country(id) ON DELETE CASCADE
        );
        CREATE UNIQUE INDEX places_region_name_country_unique ON places_region (name, country_id);
        CREATE INDEX places_regi_geometr_8e7c5b_gist ON places_region USING GIST (geometry);
    END IF;
    
    -- Create Organizer table if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='places_organizer') THEN
        CREATE TABLE places_organizer (
            id BIGSERIAL PRIMARY KEY,
            name VARCHAR(200) NOT NULL,
            email VARCHAR(254),
            phone VARCHAR(20),
            website TEXT,
            description TEXT,
            created_at TIMESTAMP WITH TIME ZONE,
            user_id INTEGER REFERENCES auth_user(id) ON DELETE SET NULL
        );
    END IF;
    
    -- Create RouteWaypoint table if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='places_routewaypoint') THEN
        CREATE TABLE places_routewaypoint (
            id BIGSERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            location geometry(Point, 4326) NOT NULL,
            "order" INTEGER NOT NULL,
            description TEXT,
            elevation INTEGER,
            route_id BIGINT REFERENCES places_route(id) ON DELETE CASCADE
        );
        CREATE UNIQUE INDEX places_routewaypoint_route_order_unique ON places_routewaypoint (route_id, "order");
        CREATE INDEX places_rout_locatio_7bb5cb_gist ON places_routewaypoint USING GIST (location);
    END IF;
    
    -- Create EventMedia table if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='places_eventmedia') THEN
        CREATE TABLE places_eventmedia (
            id BIGSERIAL PRIMARY KEY,
            media_type VARCHAR(20) NOT NULL,
            url TEXT NOT NULL,
            caption VARCHAR(200),
            "order" INTEGER DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE,
            event_id BIGINT REFERENCES places_event(id) ON DELETE CASCADE
        );
    END IF;
    
    -- Create EventAttendee table if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='places_eventattendee') THEN
        CREATE TABLE places_eventattendee (
            id BIGSERIAL PRIMARY KEY,
            status VARCHAR(20) DEFAULT 'registered',
            registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            event_id BIGINT REFERENCES places_event(id) ON DELETE CASCADE,
            user_id INTEGER REFERENCES auth_user(id) ON DELETE CASCADE
        );
        CREATE UNIQUE INDEX places_eventattendee_event_user_unique ON places_eventattendee (event_id, user_id);
        CREATE INDEX places_even_user_id_720750_idx ON places_eventattendee (user_id, status);
        CREATE INDEX places_even_event_i_ff7fd1_idx ON places_eventattendee (event_id, status);
    END IF;
    
    -- Create EventReview table if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='places_eventreview') THEN
        CREATE TABLE places_eventreview (
            id BIGSERIAL PRIMARY KEY,
            rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
            comment TEXT,
            created_at TIMESTAMP WITH TIME ZONE,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            event_id BIGINT REFERENCES places_event(id) ON DELETE CASCADE,
            user_id INTEGER REFERENCES auth_user(id) ON DELETE CASCADE
        );
        CREATE UNIQUE INDEX places_eventreview_event_user_unique ON places_eventreview (event_id, user_id);
    END IF;
    
    -- Create UserProfile table if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='places_userprofile') THEN
        CREATE TABLE places_userprofile (
            id BIGSERIAL PRIMARY KEY,
            location geometry(Point, 4326),
            user_id INTEGER UNIQUE REFERENCES auth_user(id) ON DELETE CASCADE
        );
        CREATE INDEX places_user_locatio_4d7448_gist ON places_userprofile USING GIST (location);
    END IF;
    
    -- Create UserFavorite table if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='places_userfavorite') THEN
        CREATE TABLE places_userfavorite (
            id BIGSERIAL PRIMARY KEY,
            created_at TIMESTAMP WITH TIME ZONE,
            event_id BIGINT REFERENCES places_event(id) ON DELETE CASCADE,
            neighborhood_id BIGINT REFERENCES places_neighborhood(id) ON DELETE CASCADE,
            route_id BIGINT REFERENCES places_route(id) ON DELETE CASCADE,
            user_id INTEGER REFERENCES auth_user(id) ON DELETE CASCADE,
            CONSTRAINT one_content_type_only CHECK (
                (event_id IS NOT NULL AND neighborhood_id IS NULL AND route_id IS NULL) OR
                (event_id IS NULL AND neighborhood_id IS NOT NULL AND route_id IS NULL) OR
                (event_id IS NULL AND neighborhood_id IS NULL AND route_id IS NOT NULL)
            )
        );
        CREATE INDEX places_user_user_id_cc4f15_idx ON places_userfavorite (user_id, created_at);
    END IF;
    
    -- Create TrailCompletion table if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='places_trailcompletion') THEN
        CREATE TABLE places_trailcompletion (
            id BIGSERIAL PRIMARY KEY,
            completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            notes TEXT,
            route_id BIGINT REFERENCES places_route(id) ON DELETE CASCADE,
            user_id INTEGER REFERENCES auth_user(id) ON DELETE CASCADE
        );
        CREATE UNIQUE INDEX places_trailcompletion_user_route_unique ON places_trailcompletion (user_id, route_id);
    END IF;
    
    -- Create EventSeries table if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='places_eventseries') THEN
        CREATE TABLE places_eventseries (
            id BIGSERIAL PRIMARY KEY,
            name VARCHAR(200) NOT NULL,
            description TEXT,
            frequency VARCHAR(20) NOT NULL,
            start_date DATE NOT NULL,
            end_date DATE,
            created_at TIMESTAMP WITH TIME ZONE,
            organizer_id BIGINT REFERENCES places_organizer(id) ON DELETE CASCADE
        );
    END IF;
    
    -- Create SpatialQueryLog table if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='places_spatialquerylog') THEN
        CREATE TABLE places_spatialquerylog (
            id BIGSERIAL PRIMARY KEY,
            query_type VARCHAR(50) NOT NULL,
            parameters JSONB,
            result_count INTEGER DEFAULT 0,
            execution_time_ms DOUBLE PRECISION,
            created_at TIMESTAMP WITH TIME ZONE,
            user_id INTEGER REFERENCES auth_user(id) ON DELETE SET NULL
        );
        CREATE INDEX places_spat_query_t_f0becc_idx ON places_spatialquerylog (query_type, created_at);
        CREATE INDEX places_spat_user_id_213699_idx ON places_spatialquerylog (user_id, created_at);
    END IF;
END $$;
EOSQL
fi
echo "Missing tables and fields check complete."

echo "=========================================="
echo "Running migrations..."
echo "=========================================="

# Run migrations - if created_at conflict occurs, handle it by manually adding missing fields
python manage.py migrate --noinput 2>&1 | tee /tmp/migrate.log
MIGRATE_EXIT=$?
if [ $MIGRATE_EXIT -ne 0 ]; then
    if grep -q "column.*already exists\|DuplicateColumn\|created_at.*already exists" /tmp/migrate.log 2>/dev/null; then
        echo "WARNING: created_at conflict detected. Adding missing fields manually..."
        # Add missing fields from migration 0007 that don't conflict
        if echo "${POSTGRES_HOST}" | grep -q "supabase.co\|pooler.supabase.com"; then
            CONN_STRING="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}?sslmode=require"
            PGPASSWORD="${POSTGRES_PASSWORD}" psql "${CONN_STRING}" <<EOF 2>&1 || true
-- Add missing Event fields if they don't exist
DO \$\$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='places_event' AND column_name='end_time') THEN
        ALTER TABLE places_event ADD COLUMN end_time TIMESTAMP WITH TIME ZONE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='places_event' AND column_name='price') THEN
        ALTER TABLE places_event ADD COLUMN price NUMERIC(10, 2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='places_event' AND column_name='capacity') THEN
        ALTER TABLE places_event ADD COLUMN capacity INTEGER;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='places_event' AND column_name='recurring') THEN
        ALTER TABLE places_event ADD COLUMN recurring BOOLEAN DEFAULT FALSE;
    END IF;
END \$\$;
EOF
        else
            PGPASSWORD="${POSTGRES_PASSWORD}" psql -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" <<EOF 2>&1 || true
-- Add missing Event fields if they don't exist
DO \$\$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='places_event' AND column_name='end_time') THEN
        ALTER TABLE places_event ADD COLUMN end_time TIMESTAMP WITH TIME ZONE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='places_event' AND column_name='price') THEN
        ALTER TABLE places_event ADD COLUMN price NUMERIC(10, 2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='places_event' AND column_name='capacity') THEN
        ALTER TABLE places_event ADD COLUMN capacity INTEGER;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='places_event' AND column_name='recurring') THEN
        ALTER TABLE places_event ADD COLUMN recurring BOOLEAN DEFAULT FALSE;
    END IF;
END \$\$;
EOF
        fi
        echo "Marking migration 0007 as applied (faked) since we manually added the fields..."
        python manage.py migrate places 0007 --fake --noinput 2>&1 || true
        echo "Retrying remaining migrations..."
        python manage.py migrate --noinput 2>&1 | tee /tmp/migrate2.log
        MIGRATE2_EXIT=$?
        if [ $MIGRATE2_EXIT -ne 0 ]; then
            echo "Migrations still failing. Check logs:"
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
