# places/views_api.py
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.contrib.gis.geos import Point
from django.contrib.gis.measure import D
from rest_framework.viewsets import ViewSet
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Event, Route, Neighborhood
from .serializers import (
    EventGeoSerializer,
    RouteGeoSerializer,
    NeighborhoodGeoSerializer,
)

# ---- helpers -----------------------------------------------------

def get_geom_attr(obj, candidates):
    """
    Return the first attribute on `obj` that exists from `candidates`.
    This lets us support different field names like 'geom', 'area', 'polygon', etc.
    """
    for name in candidates:
        if hasattr(obj, name):
            return getattr(obj, name)
    raise AttributeError(
        f"{obj.__class__.__name__} has none of {', '.join(candidates)}"
    )

# These are the common names we’ll try for each model
EVENT_POINT_FIELD = ("location", "geom", "point")
ROUTE_LINE_FIELDS = ("path", "line", "geom", "linestring", "geometry")
HOOD_POLY_FIELDS  = ("area", "polygon", "geom", "geometry", "boundary")

# ---- viewsets ----------------------------------------------------

class EventViewSet(ViewSet):
    """
    /api/events/                -> all events (GeoJSON FeatureCollection)
    /api/events/nearby/         -> ?lat=..&lng=..&radius=1000 (meters)
    /api/events/in_neighborhood/-> ?neighborhood_id=ID
    /api/events/along_route/    -> ?route_id=ID&buffer=200 (meters)
    """

    def list(self, request):
        qs = Event.objects.all()
        ser = EventGeoSerializer(qs, many=True)
        return Response(ser.data)

    @action(detail=False, methods=["get"])
    def nearby(self, request):
        try:
            lat = float(request.GET.get("lat", ""))
            lng = float(request.GET.get("lng", ""))
            radius = int(request.GET.get("radius", "1000"))
        except ValueError:
            return Response({"error": "Invalid lat/lng/radius."}, status=400)

        pt = Point(lng, lat, srid=4326)

        # IMPORTANT: Event geometry field is 'location' (not 'geom').
        qs = Event.objects.filter(**{
            f"{EVENT_POINT_FIELD[0]}__distance_lte": (pt, D(m=radius))
        })

        ser = EventGeoSerializer(qs, many=True)
        return Response(ser.data)

    @action(detail=False, methods=["get"])
    def in_neighborhood(self, request):
        hood_id = request.GET.get("neighborhood_id")
        if not hood_id:
            return Response({"error": "neighborhood_id is required."}, status=400)

        hood = get_object_or_404(Neighborhood, pk=hood_id)
        hood_geom = get_geom_attr(hood, HOOD_POLY_FIELDS)

        qs = Event.objects.filter(**{
            f"{EVENT_POINT_FIELD[0]}__within": hood_geom
        })

        ser = EventGeoSerializer(qs, many=True)
        return Response(ser.data)

    @action(detail=False, methods=["get"])
    def along_route(self, request):
        route_id = request.GET.get("route_id")
        buffer_m = int(request.GET.get("buffer", "200"))
        if not route_id:
            return Response({"error": "route_id is required."}, status=400)

        route = get_object_or_404(Route, pk=route_id)
        route_geom = get_geom_attr(route, ROUTE_LINE_FIELDS)

        # Use dwithin against the line with a meter buffer
        qs = Event.objects.filter(**{
            f"{EVENT_POINT_FIELD[0]}__dwithin": (route_geom, buffer_m)
        })

        ser = EventGeoSerializer(qs, many=True)
        return Response(ser.data)


class RouteViewSet(ViewSet):
    def list(self, request):
        qs = Route.objects.all()
        ser = RouteGeoSerializer(qs, many=True)
        return Response(ser.data)


class NeighborhoodViewSet(ViewSet):
    def list(self, request):
        qs = Neighborhood.objects.all()
        ser = NeighborhoodGeoSerializer(qs, many=True)
        return Response(ser.data)
