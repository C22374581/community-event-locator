# places/views_api.py
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.contrib.gis.geos import Point
from django.contrib.gis.measure import D

from rest_framework.viewsets import ViewSet
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import filters
from django_filters.rest_framework import DjangoFilterBackend

from .models import Event, Route, Neighborhood
from .serializers import (
    EventGeoSerializer,
    RouteGeoSerializer,
    NeighborhoodGeoSerializer,
)

# ---- helpers ---------------------------------------------------------------

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

# Common geometry field names we’ll try for each model
EVENT_POINT_FIELD = ("location", "geom", "point")
ROUTE_LINE_FIELDS = ("path", "line", "geom", "linestring", "geometry")
HOOD_POLY_FIELDS = ("area", "polygon", "geom", "geometry", "boundary")

# ---- viewsets --------------------------------------------------------------

class EventViewSet(ViewSet):
    """
    /api/events/                -> list (GeoJSON)
    /api/events/?search=...     -> search title/description
    /api/events/?ordering=when  -> order by when (-when desc)
    /api/events/?from=2025-01-01&to=2025-12-31 -> date range
    /api/events/nearby/         -> ?lat=&lng=&radius=1000 (meters)
    /api/events/in_neighborhood/-> ?neighborhood_id=ID
    /api/events/along_route/    -> ?route_id=ID&buffer=200 (meters)
    """

    # simple param handling for filtering, search & ordering
    SEARCH_FIELDS = ("title", "description")
    ORDERING_FIELDS = ("when", "title", "id")

    def list(self, request):
        qs = Event.objects.all()

        # date range filter (optional)
        date_from = request.GET.get("from")
        date_to = request.GET.get("to")
        if date_from:
            qs = qs.filter(when__date__gte=date_from)
        if date_to:
            qs = qs.filter(when__date__lte=date_to)

        # text search (icontains OR across fields)
        term = request.GET.get("search")
        if term:
            from django.db.models import Q
            q = Q()
            for field in self.SEARCH_FIELDS:
                q |= Q(**{f"{field}__icontains": term})
            qs = qs.filter(q)

        # ordering (default newest first)
        ordering = request.GET.get("ordering") or "-when"
        # only allow whitelisted fields
        if ordering.lstrip("-") in self.ORDERING_FIELDS:
            qs = qs.order_by(ordering)

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

        # IMPORTANT: geometry field for Event is 'location' (not 'geom').
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

        # Use dwithin against the line with a meter buffer (backs geography=True nicely)
        qs = Event.objects.filter(**{
            f"{EVENT_POINT_FIELD[0]}__dwithin": (route_geom, D(m=buffer_m))
        })

        ser = EventGeoSerializer(qs, many=True)
        return Response(ser.data)


class RouteViewSet(ViewSet):
    """
    /api/routes/?search=...&ordering=name
    """
    SEARCH_FIELDS = ("name",)
    ORDERING_FIELDS = ("name", "id")

    def list(self, request):
        qs = Route.objects.all()

        term = request.GET.get("search")
        if term:
            from django.db.models import Q
            q = Q()
            for field in self.SEARCH_FIELDS:
                q |= Q(**{f"{field}__icontains": term})
            qs = qs.filter(q)

        ordering = request.GET.get("ordering") or "name"
        if ordering.lstrip("-") in self.ORDERING_FIELDS:
            qs = qs.order_by(ordering)

        ser = RouteGeoSerializer(qs, many=True)
        return Response(ser.data)


class NeighborhoodViewSet(ViewSet):
    """
    /api/neighborhoods/?search=...&ordering=name
    """
    SEARCH_FIELDS = ("name",)
    ORDERING_FIELDS = ("name", "id")

    def list(self, request):
        qs = Neighborhood.objects.all()

        term = request.GET.get("search")
        if term:
            from django.db.models import Q
            q = Q()
            for field in self.SEARCH_FIELDS:
                q |= Q(**{f"{field}__icontains": term})
            qs = qs.filter(q)

        ordering = request.GET.get("ordering") or "name"
        if ordering.lstrip("-") in self.ORDERING_FIELDS:
            qs = qs.order_by(ordering)

        ser = NeighborhoodGeoSerializer(qs, many=True)
        return Response(ser.data)
