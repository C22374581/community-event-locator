from django.contrib import admin
from django.urls import path, include
from places.views import home, map_view
from rest_framework import routers
from places.views_api import EventViewSet, RouteViewSet, NeighborhoodViewSet

router = routers.DefaultRouter()
router.register(r"events", EventViewSet, basename="event")
router.register(r"routes", RouteViewSet, basename="route")
router.register(r"neighborhoods", NeighborhoodViewSet, basename="neighborhood")

urlpatterns = [
    path("admin/", admin.site.urls),
    path("", home, name="home"),
    path("map/", map_view, name="map"),
    path("api/", include(router.urls)),
]
