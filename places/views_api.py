from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from django.contrib.gis.geos import Point
from django.contrib.gis.measure import D
from django.contrib.gis.db.models.functions import Distance

from .models import Event, Route, Neighborhood
from .serializers import (
    EventGeoSerializer,
    RouteGeoSerializer,
    NeighborhoodGeoSerializer,
)


class EventViewSet(viewsets.ModelViewSet):
    queryset = Event.objects.all().order_by('id')
    serializer_class = EventGeoSerializer

    @action(detail=False, methods=["get"])
    def nearby(self, request):
        """
        GET /api/events/nearby/?lat=..&lng=..&radius=..
        - lat/lng in WGS84
        - radius in meters (default 1000)
        Returns events within radius ordered by distance.
        """
        # lat/lng required
        try:
            lat = float(request.query_params.get("lat"))
            lng = float(request.query_params.get("lng"))
        except (TypeError, ValueError):
            return Response({"detail": "lat and lng are required as numbers"}, status=400)

        # optional radius (meters)
        try:
            radius = float(request.query_params.get("radius", 1000))
        except ValueError:
            return Response({"detail": "radius must be a number (meters)"}, status=400)

        # sanity checks
        if not (-90 <= lat <= 90 and -180 <= lng <= 180):
            return Response({"detail": "lat/lng out of range"}, status=400)
        if radius <= 0 or radius > 50000:
            return Response({"detail": "radius must be between 1 and 50000 meters"}, status=400)

        center = Point(lng, lat, srid=4326)

        qs = (
            self.get_queryset()
            .annotate(distance=Distance("location", center))
            .filter(location__distance_lte=(center, D(m=radius)))
            .order_by("distance")
        )
        serializer = self.get_serializer(qs, many=True, context={"request": request})
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def in_neighborhood(self, request):
        """
        GET /api/events/in_neighborhood/?neighborhood_id=1
        Returns events whose location is within the given neighborhood polygon.
        """
        nid = request.query_params.get("neighborhood_id")
        if not nid:
            return Response({"detail": "neighborhood_id is required"}, status=400)
        try:
            nid = int(nid)
        except ValueError:
            return Response({"detail": "neighborhood_id must be an integer"}, status=400)

        try:
            hood = Neighborhood.objects.get(pk=nid)
        except Neighborhood.DoesNotExist:
            return Response({"detail": "neighborhood not found"}, status=404)

        qs = self.get_queryset().filter(location__within=hood.area).order_by("id")
        serializer = self.get_serializer(qs, many=True, context={"request": request})
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def along_route(self, request):
        """
        GET /api/events/along_route/?route_id=1&buffer=200
        Returns events within a buffer (meters) of the given route polyline,
        ordered by distance to that route.
        """
        rid = request.query_params.get("route_id")
        if not rid:
            return Response({"detail": "route_id is required"}, status=400)
        try:
            rid = int(rid)
        except ValueError:
            return Response({"detail": "route_id must be an integer"}, status=400)

        try:
            route = Route.objects.get(pk=rid)
        except Route.DoesNotExist:
            return Response({"detail": "route not found"}, status=404)

        try:
            buf_m = float(request.query_params.get("buffer", 150))
        except ValueError:
            return Response({"detail": "buffer must be a number (meters)"}, status=400)
        if buf_m <= 0 or buf_m > 100000:
            return Response({"detail": "buffer must be between 1 and 100000 meters"}, status=400)

        qs = (
            self.get_queryset()
            .filter(location__distance_lte=(route.path, D(m=buf_m)))
            .annotate(distance=Distance("location", route.path))
            .order_by("distance")
        )
        serializer = self.get_serializer(qs, many=True, context={"request": request})
        return Response(serializer.data)


class RouteViewSet(viewsets.ModelViewSet):
    queryset = Route.objects.all().order_by('id')
    serializer_class = RouteGeoSerializer


class NeighborhoodViewSet(viewsets.ModelViewSet):
    queryset = Neighborhood.objects.all().order_by('id')
    serializer_class = NeighborhoodGeoSerializer


