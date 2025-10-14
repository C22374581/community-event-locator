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


class RouteViewSet(viewsets.ModelViewSet):
    queryset = Route.objects.all().order_by('id')
    serializer_class = RouteGeoSerializer


class NeighborhoodViewSet(viewsets.ModelViewSet):
    queryset = Neighborhood.objects.all().order_by('id')
    serializer_class = NeighborhoodGeoSerializer

