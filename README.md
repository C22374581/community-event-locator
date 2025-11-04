# Community Event Locator
# Community Event Locator

A small location-based web app that lets you explore events, walking routes, and neighborhoods on an interactive map.  
Stack: **Django + Django REST Framework + PostGIS + Leaflet**, served by **Gunicorn** behind **Nginx**, all in **Docker**.

---

## What it does

- Stores spatial data for **events** (points), **routes** (lines), and **neighborhoods** (polygons).
- Exposes REST/GeoJSON endpoints with real spatial queries:
  - **Nearby**: events within a radius of a lat/lng.
  - **In neighborhood**: events contained by a polygon.
  - **Along route**: events within a buffer of a route line.
- Responsive front-end with a Leaflet map and simple controls.
- OpenAPI schema + Swagger/Redoc docs generated via drf-spectacular.

---

## Quick start (Docker)

1) Copy env and adjust if you want:
cp .env.example .env

docker compose build
docker compose up -d
Open the app:

App home: http://localhost/

Map UI: http://localhost/map/

API root: http://localhost/api/

Swagger: http://localhost/api/docs/

Redoc: http://localhost/api/redoc/

Health check: http://localhost/health/

pgAdmin (optional): http://localhost:5050/

Use PGADMIN_EMAIL / PGADMIN_PASSWORD from your .env.

The PostGIS DB is created automatically, with extensions enabled.
If you want your local data inside the container, restore a dump with pg_restore into the db service.

python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # add your local DB creds
python manage.py migrate
python manage.py collectstatic --noinput
python manage.py runserver

API cheatsheet

Nearby events
GET /api/events/nearby/?lat=53.3498&lng=-6.2603&radius=1500

Events in a neighborhood
GET /api/events/in_neighborhood/?neighborhood_id=1

Events along a route
GET /api/events/along_route/?route_id=2&buffer=200

Non-paginated Geo endpoints

Routes: GET /api/routes/

Neighborhoods: GET /api/neighborhoods/

All list endpoints return proper GeoJSON Features/FeatureCollections.

How it’s structured

Django app: places/ (models, serializers, spatial viewsets)

API views: places/views_api.py
(search/order, pagination, bbox filter, and the three spatial actions)

Front-end: templates/ + static/js/map.js (Leaflet UI)

OpenAPI: drf-spectacular in config/settings.py

Docker:

web (Django + Gunicorn),

db (PostGIS),

nginx (reverse proxy),

pgadmin (optional, for DB admin)

networks: frontend + backend, named volumes for data/static/media


## Architecture


flowchart LR
  browser[Browser] --> nginx[Nginx Reverse Proxy]
  nginx --> web[Django + DRF (Gunicorn)]
  web --> db[(PostgreSQL + PostGIS)]
  browser -->|Tiles| osm[OpenStreetMap]

  subgraph Docker Networks
    nginx --- web
    web --- db
  end



