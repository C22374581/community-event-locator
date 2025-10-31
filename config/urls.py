# config/urls.py
from django.contrib import admin
from django.urls import path, include
from rest_framework import routers
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
    SpectacularRedocView,
)
from places.views import home, map_view
from places.views_api import EventViewSet, RouteViewSet, NeighborhoodViewSet
from django.http import JsonResponse

# ---------------------------------------------------------
# Routers
# ---------------------------------------------------------
router = routers.DefaultRouter()
router.register(r"events", EventViewSet, basename="event")
router.register(r"routes", RouteViewSet, basename="route")
router.register(r"neighborhoods", NeighborhoodViewSet, basename="neighborhood")

# ---------------------------------------------------------
# Simple health check endpoint (great for demos)
# ---------------------------------------------------------
def health(_):
    return JsonResponse({"status": "ok"})

# ---------------------------------------------------------
# URL patterns
# ---------------------------------------------------------
urlpatterns = [
    # Django admin
    path("admin/", admin.site.urls),

    # Core pages
    path("", home, name="home"),
    path("map/", map_view, name="map"),
    path("health/", health, name="health"),

    # API routes
    path("api/", include(router.urls)),

    # OpenAPI schema + Swagger / Redoc docs
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
]
