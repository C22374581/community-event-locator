# places/views_api.py
from django.shortcuts import get_object_or_404
from django.contrib.gis.geos import Point
from django.contrib.gis.measure import D

from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet
from rest_framework.pagination import PageNumberPagination

from .models import Event, Route, Neighborhood
from .serializers import (
    EventGeoSerializer,
    RouteGeoSerializer,
    NeighborhoodGeoSerializer,
)

# ------------------------------------------------------------------------------
# Helpers
# ------------------------------------------------------------------------------

def _first_geom_attr(obj, candidates):
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

# These are the *fallback lists* we’ll try for each model
EVENT_POINT_FIELD = ("location", "geom", "point")
ROUTE_LINE_FIELDS = ("path", "line", "geom", "linestring", "geometry")
HOOD_POLY_FIELDS  = ("area", "polygon", "geom", "geometry", "boundary")


# ------------------------------------------------------------------------------
# Event API
# ------------------------------------------------------------------------------

class EventViewSet(GenericViewSet):
    """
    /api/events/                 -> events list (GeoJSON FeatureCollection)
      ?q=… (title/description search)
      ?ordering=when,-title (default -when)
      Pagination: PageNumberPagination

    /api/events/nearby/          -> ?lat=…&lng=…&radius=1000 (meters)
    /api/events/in_neighborhood/ -> ?neighborhood_id=ID
    /api/events/along_route/     -> ?route_id=ID&buffer=200 (meters)
    """

    pagination_class = PageNumberPagination

    def list(self, request):
        qs = Event.objects.all()

        # search
        q = (request.GET.get("q") or "").strip()
        if q:
            qs = qs.filter(title__icontains=q) | qs.filter(description__icontains=q)

        # ordering (default newest first by when)
        ordering = (request.GET.get("ordering") or "-when")
        ordering = [o.strip() for o in ordering.split(",") if o.strip()]
        if ordering:
            qs = qs.order_by(*ordering)

        page = self.paginate_queryset(qs)
        if page is not None:
            ser = EventGeoSerializer(page, many=True)
            return self.get_paginated_response(ser.data)

        ser = EventGeoSerializer(qs, many=True)
        return Response(ser.data)

    @action(detail=False, methods=["get"])
    def nearby(self, request):
        # Validate query params
        try:
            lat = float(request.GET.get("lat", ""))
            lng = float(request.GET.get("lng", ""))
            radius = int(request.GET.get("radius", "1000"))
        except ValueError:
            return Response({"error": "Invalid lat/lng/radius."}, status=400)

        pt = Point(lng, lat, srid=4326)

        # NOTE: events use a *PointField geography* (meters-aware Distance via D)
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
        hood_geom = _first_geom_attr(hood, HOOD_POLY_FIELDS)

        # All events within neighborhood polygon
        qs = Event.objects.filter(**{
            f"{EVENT_POINT_FIELD[0]}__within": hood_geom
        })

        ser = EventGeoSerializer(qs, many=True)
        return Response(ser.data)

    @action(detail=False, methods=["get"])
    def along_route(self, request):
        route_id = request.GET.get("route_id")
        try:
            buffer_m = int(request.GET.get("buffer", "200"))
        except ValueError:
            buffer_m = 200

        if not route_id:
            return Response({"error": "route_id is required."}, status=400)

        route = get_object_or_404(Route, pk=route_id)
        route_geom = _first_geom_attr(route, ROUTE_LINE_FIELDS)

        # IMPORTANT: for *geography* fields, __dwithin expects *degrees* if you
        # pass a raw number; with Distance() we can give meters safely.
        qs = Event.objects.filter(**{
            f"{EVENT_POINT_FIELD[0]}__distance_lte": (route_geom, D(m=buffer_m))
        })

        ser = EventGeoSerializer(qs, many=True)
        return Response(ser.data)


# ------------------------------------------------------------------------------
# Route & Neighborhood lists (no pagination)
# ------------------------------------------------------------------------------

class RouteViewSet(GenericViewSet):
    """Return routes as a GeoJSON FeatureCollection (no pagination)."""

    def list(self, request):
        qs = Route.objects.all()

        # minimal search & ordering support
        q = (request.GET.get("q") or "").strip()
        if q:
            qs = qs.filter(name__icontains=q)

        ordering = (request.GET.get("ordering") or "name")
        ordering = [o.strip() for o in ordering.split(",") if o.strip()]
        if ordering:
            qs = qs.order_by(*ordering)

        ser = RouteGeoSerializer(qs, many=True)
        return Response(ser.data)


class NeighborhoodViewSet(GenericViewSet):
    """Return neighborhoods as a GeoJSON FeatureCollection (no pagination)."""

    def list(self, request):
        qs = Neighborhood.objects.all()

        q = (request.GET.get("q") or "").strip()
        if q:
            qs = qs.filter(name__icontains=q)

        ordering = (request.GET.get("ordering") or "name")
        ordering = [o.strip() for o in ordering.split(",") if o.strip()]
        if ordering:
            qs = qs.order_by(*ordering)

        ser = NeighborhoodGeoSerializer(qs, many=True)
        return Response(ser.data)
