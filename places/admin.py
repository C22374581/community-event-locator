from django.contrib import admin
from django.contrib.gis.admin import GISModelAdmin
from .models import Neighborhood, Route, Event

# Web Mercator (EPSG:3857) coords roughly centered on Dublin.
DUBLIN_LON_3857 = -626000
DUBLIN_LAT_3857 = 7025000

@admin.register(Neighborhood)
class NeighborhoodAdmin(GISModelAdmin):
    list_display = ("name",)
    default_lon = DUBLIN_LON_3857
    default_lat = DUBLIN_LAT_3857
    default_zoom = 11

@admin.register(Route)
class RouteAdmin(GISModelAdmin):
    list_display = ("name",)
    default_lon = DUBLIN_LON_3857
    default_lat = DUBLIN_LAT_3857
    default_zoom = 11

@admin.register(Event)
class EventAdmin(GISModelAdmin):
    list_display = ("title", "when")
    default_lon = DUBLIN_LON_3857
    default_lat = DUBLIN_LAT_3857
    default_zoom = 12


