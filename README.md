# Community Event Locator

Web application for finding community events and walking trails using location-based services.

## About

This is a Django web application that lets users discover events and trails on an interactive map. It uses PostGIS for spatial data and Leaflet for mapping.

## Technologies

- PostgreSQL with PostGIS
- Django with Django REST Framework
- Progressive Web App (PWA)
- Leaflet.js with OpenStreetMap
- Docker

## Setup

### Requirements
- Docker Desktop

### Steps

1. Extract the zip file

2. Open terminal in the extracted folder

3. Create .env file:
   ```
   Copy .env.example to .env
   ```

4. Start Docker Desktop

5. Run the application:
   ```
   docker compose up --build
   ```
   
   Or on Windows PowerShell:
   ```
   .\START_PROJECT.ps1
   ```

6. Set up database:
   ```
   docker compose exec web python manage.py migrate
   docker compose exec web python manage.py createsuperuser
   docker compose exec web python manage.py seed_world_events
   ```

7. Open in browser:
   - http://localhost/

## Pages

- Home: http://localhost/
- Map: http://localhost/map/
- Trails: http://localhost/trails/
- Events: http://localhost/events/
- API: http://localhost/api/
- Admin: http://localhost/admin/

## Features

- Interactive map with multiple layers
- Search for events by location
- Find events along trails
- Draw custom areas to search
- PWA - can install and work offline
- REST API with GeoJSON

## API Endpoints

- GET /api/events/ - List events
- GET /api/events/nearby/ - Nearby events
- GET /api/events/along_route/ - Events on route
- GET /api/routes/ - List trails
- GET /api/neighborhoods/ - List neighborhoods

See http://localhost/api/docs/ for full API documentation.

## PWA

The app can be installed on mobile and desktop. Visit http://localhost/map/ and look for the install button. It also works offline after the first visit.

## Troubleshooting

If Docker won't start:
- Make sure Docker Desktop is running
- Check if ports 80 or 5432 are in use
- Try: docker compose logs -f

If database errors:
- Reset: docker compose down -v
- Rebuild: docker compose up --build

## Environment Variables

The .env file needs these variables (see .env.example):

```
POSTGRES_DB=lbsdb
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_HOST=db
POSTGRES_PORT=5432
DJANGO_SECRET_KEY=your-secret-key
DJANGO_DEBUG=True
DJANGO_ALLOWED_HOSTS=127.0.0.1,localhost,0.0.0.0,web,nginx
```

## Project Structure

- config/ - Django settings
- places/ - Main app with models and views
- static/ - CSS, JavaScript, PWA files
- templates/ - HTML pages
- nginx/ - Web server config

## Database

The app uses PostgreSQL with PostGIS extension for spatial data. Models include Event, Route, Neighborhood, and others.

## Notes

- First run takes a few minutes to download Docker images
- Database data persists in Docker volumes
- Create admin user with: docker compose exec web python manage.py createsuperuser
