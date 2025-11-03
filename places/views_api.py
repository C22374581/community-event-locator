# places/views_api.py
from django.shortcuts import get_object_or_404
from django.contrib.gis.geos import Point
from django.contrib.gis.measure import D as Distance

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

"""
API layer for spatial data (Events, Routes, Neighborhoods).
Implements GeoJSON endpoints using PostGIS + Django REST Framework (DRF-GIS).

NOTE: Our Geo* serializers already emit the proper GeoJSON when used with
`many=True`. Do NOT wrap the serializer output inside another
FeatureCollection.
"""

# ---------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------
def _first_geom_attr(obj, candidates):
    """
    Return the first attribute on `obj` that exists from `candidates`.
    Supports different field names like 'geom', 'area', 'polygon', 'geometry', etc.
    """
    for name in candidates:
        if hasattr(obj, name):
            return getattr(obj, name)
    raise AttributeError(
        f"{obj.__class__.__name__} has none of {', '.join(candidates)}"
    )


# Fallback field lists for geometry lookup
EVENT_POINT_FIELD = ("location", "geom", "point")
ROUTE_LINE_FIELDS = ("path", "line", "geom", "linestring", "geometry")
HOOD_POLY_FIELDS  = ("area", "polygon", "geom", "geometry", "boundary")


# ---------------------------------------------------------------------
# Event API
# ---------------------------------------------------------------------
class EventViewSet(GenericViewSet):
    """
    API for listing and filtering Events with spatial queries.

        /api/events/              -> Paginated list (search + ordering)
        /api/events/nearby/       -> Events within radius (meters)
        /api/events/in_neighborhood/ -> Events inside neighborhood polygon
        /api/events/along_route/  -> Events near a route (buffered)
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

        # pagination
        page = self.paginate_queryset(qs)
        ser = EventGeoSerializer(page or qs, many=True)

        if page is not None:
            # DRF paginator will put `results` around serializer data.
            # Our serializer already returns the correct GeoJSON for the items,
            # so we just hand its data to the paginator.
            return self.get_paginated_response(ser.data)

        # Non-paginated: just return the serializer data directly.
        return Response(ser.data)

    # -----------------------------
    # Nearby (by lat/lng + radius)
    # -----------------------------
    @action(detail=False, methods=["get"])
    def nearby(self, request):
        try:
            lat = float(request.GET.get("lat", ""))
            lng = float(request.GET.get("lng", ""))
            radius = int(request.GET.get("radius", "1000"))
        except ValueError:
            return Response({"error": "Invalid lat/lng/radius."}, status=400)

        pt = Point(lng, lat, srid=4326)
        qs = Event.objects.filter(**{
            f"{EVENT_POINT_FIELD[0]}__distance_lte": (pt, Distance(m=radius))
        })
        ser = EventGeoSerializer(qs, many=True)
        return Response(ser.data)

    # -----------------------------
    # In neighborhood
    # -----------------------------
    @action(detail=False, methods=["get"])
    def in_neighborhood(self, request):
        hood_id = request.GET.get("neighborhood_id")
        if not hood_id:
            return Response({"error": "neighborhood_id is required."}, status=400)

        hood = get_object_or_404(Neighborhood, pk=hood_id)
        hood_geom = _first_geom_attr(hood, HOOD_POLY_FIELDS)

        qs = Event.objects.filter(**{
            f"{EVENT_POINT_FIELD[0]}__within": hood_geom
        })
        ser = EventGeoSerializer(qs, many=True)
        return Response(ser.data)

    # -----------------------------
    # Along route (buffer)
    # -----------------------------
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

        # geography fields + Distance() lets us pass meters safely
        qs = Event.objects.filter(**{
            f"{EVENT_POINT_FIELD[0]}__distance_lte": (route_geom, Distance(m=buffer_m))
        })
        ser = EventGeoSerializer(qs, many=True)
        return Response(ser.data)


# ---------------------------------------------------------------------
# Route & Neighborhood APIs (no pagination)
# ---------------------------------------------------------------------
class RouteViewSet(GenericViewSet):
    """Return routes as a GeoJSON FeatureCollection (no pagination)."""

    def list(self, request):
        qs = Route.objects.all()

        # minimal search & ordering
        q = (request.GET.get("q") or "").strip()
        if q:
            qs = qs.filter(name__icontains=q)

        ordering = (request.GET.get("ordering") or "name")
        ordering = [o.strip() for o in ordering.split(",") if o.strip()]
        if ordering:
            qs = qs.order_by(*ordering)

        ser = RouteGeoSerializer(qs, many=True)
        # serializer already returns FeatureCollection-compatible items
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
        # serializer already returns FeatureCollection-compatible items
        return Response(ser.data)
