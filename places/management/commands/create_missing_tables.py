"""
Django management command to create missing database tables.
"""
from django.core.management.base import BaseCommand
from django.db import connection


class Command(BaseCommand):
    help = 'Create missing database tables (EventMedia, RouteWaypoint)'

    def handle(self, *args, **options):
        with connection.cursor() as cur:
            # Create EventMedia table
            self.stdout.write('Creating places_eventmedia table...')
            cur.execute("""
                CREATE TABLE IF NOT EXISTS places_eventmedia (
                    id BIGSERIAL PRIMARY KEY,
                    event_id BIGINT NOT NULL REFERENCES places_event(id),
                    media_type VARCHAR(20),
                    url TEXT,
                    caption VARCHAR(200),
                    "order" INTEGER DEFAULT 0,
                    created_at TIMESTAMP
                )
            """)
            
            # Create RouteWaypoint table
            self.stdout.write('Creating places_routewaypoint table...')
            cur.execute("""
                CREATE TABLE IF NOT EXISTS places_routewaypoint (
                    id BIGSERIAL PRIMARY KEY,
                    route_id BIGINT NOT NULL REFERENCES places_route(id),
                    name VARCHAR(100),
                    location GEOMETRY(POINT, 4326),
                    "order" INTEGER,
                    description TEXT,
                    elevation INTEGER
                )
            """)
            
            # Create index
            self.stdout.write('Creating indexes...')
            cur.execute("""
                CREATE INDEX IF NOT EXISTS places_rout_locatio_7bb5cb_gist 
                ON places_routewaypoint USING GIST(location)
            """)
            
            # Add unique constraint
            self.stdout.write('Adding constraints...')
            cur.execute("""
                DO $$ 
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM pg_constraint 
                        WHERE conname = 'places_routewaypoint_route_id_order_unique'
                    ) THEN
                        ALTER TABLE places_routewaypoint 
                        ADD CONSTRAINT places_routewaypoint_route_id_order_unique 
                        UNIQUE(route_id, "order");
                    END IF;
                END $$;
            """)
            
            self.stdout.write(self.style.SUCCESS('✅ All tables created successfully!'))

