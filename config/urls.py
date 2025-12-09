# config/urls.py
from django.contrib import admin
from django.urls import path, include
from rest_framework import routers
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
    SpectacularRedocView,
)
from places.views import home, map_view, trails_view, events_view
from places.views_api import EventViewSet, RouteViewSet, NeighborhoodViewSet, EventCategoryViewSet
from django.http import JsonResponse, FileResponse
from django.conf import settings
from django.conf.urls.static import static
import os

# ---------------------------------------------------------
# Routers
# ---------------------------------------------------------
router = routers.DefaultRouter()
router.register(r"events", EventViewSet, basename="event")
router.register(r"routes", RouteViewSet, basename="route")
router.register(r"neighborhoods", NeighborhoodViewSet, basename="neighborhood")
router.register(r"categories", EventCategoryViewSet, basename="category")

# ---------------------------------------------------------
# Simple health check endpoint (great for demos)
# ---------------------------------------------------------
def health(_):
    return JsonResponse({"status": "ok"})

# ---------------------------------------------------------
# PWA Manifest endpoint
# ---------------------------------------------------------
def manifest(request):
    from django.views.decorators.cache import never_cache
    from django.shortcuts import render
    
    manifest_path = os.path.join(settings.STATICFILES_DIRS[0], 'manifest.json')
    try:
        with open(manifest_path, 'rb') as f:
            response = FileResponse(f, content_type='application/manifest+json')
            response['Cache-Control'] = 'public, max-age=3600'
            return response
    except FileNotFoundError:
        return JsonResponse({'error': 'Manifest not found'}, status=404)

# ---------------------------------------------------------
# Offline page
# ---------------------------------------------------------
def offline_page(request):
    from django.shortcuts import render
    return render(request, 'offline.html')

# ---------------------------------------------------------
# URL patterns
# ---------------------------------------------------------
urlpatterns = [
    # Django admin
    path("admin/", admin.site.urls),

    # Core pages
    path("", home, name="home"),
    path("map/", map_view, name="map"),
    path("trails/", trails_view, name="trails"),
    path("events/", events_view, name="events"),
    path("health/", health, name="health"),
    
    # PWA
    path("manifest.json", manifest, name="manifest"),
    path("offline.html", offline_page, name="offline"),

    # API routes
    path("api/", include(router.urls)),

    # OpenAPI schema + Swagger / Redoc docs
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
]

# Serve static files in production (Railway doesn't use nginx)
if not settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
