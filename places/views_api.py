from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.gis.geos import Point
from django.contrib.gis.measure import D
from django.shortcuts import get_object_or_404

from .models import Event, Neighborhood, Route
from .serializers import (
    EventGeoSerializer,
    NeighborhoodGeoSerializer,
    RouteGeoSerializer,
)

def _as_feature_collection(data):
    """
    DRF-GIS GeoFeatureModelSerializer with many=True usually returns a FeatureCollection already.
    But if we ever get a plain list of Features, wrap it so Leaflet always gets a FeatureCollection.
    """
    if isinstance(data, dict) and data.get("type") == "FeatureCollection":
        return data
    return {"type": "FeatureCollection", "features": data}

class EventViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Event.objects.all()
    serializer_class = EventGeoSerializer

    def _validate_latlng(self, request):
        try:
            lat = float(request.GET.get("lat"))
            lng = float(request.GET.get("lng"))
            if not (-90 <= lat <= 90 and -180 <= lng <= 180):
                raise ValueError
            return lat, lng
        except (TypeError, ValueError):
            return None, None

    @action(detail=False, methods=["get"])
    def nearby(self, request):
        lat, lng = self._validate_latlng(request)
        if lat is None or lng is None:
            return Response(
                {"error": "Invalid or missing lat/lng."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            radius = float(request.GET.get("radius", 1000))
            if radius <= 0:
                raise ValueError
        except ValueError:
            return Response(
                {"error": "Radius must be a positive number."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user_location = Point(lng, lat, srid=4326)
        qs = Event.objects.filter(location__distance_lte=(user_location, D(m=radius)))
        ser = self.get_serializer(qs, many=True)
        return Response(_as_feature_collection(ser.data))

    @action(detail=False, methods=["get"])
    def in_neighborhood(self, request):
        hood_id = request.GET.get("neighborhood_id")
        if not hood_id:
            return Response(
                {"error": "Missing neighborhood_id parameter."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        neighborhood = get_object_or_404(Neighborhood, id=hood_id)
        qs = Event.objects.filter(location__within=neighborhood.geom)
        ser = self.get_serializer(qs, many=True)
        return Response(_as_feature_collection(ser.data))

    @action(detail=False, methods=["get"])
    def along_route(self, request):
        route_id = request.GET.get("route_id")
        if not route_id:
            return Response(
                {"error": "Missing route_id parameter."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            buffer_dist = float(request.GET.get("buffer", 200))
            if buffer_dist <= 0:
                raise ValueError
        except ValueError:
            return Response(
                {"error": "Buffer distance must be a positive number."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        route = get_object_or_404(Route, id=route_id)
        # crude meters->degrees conversion for small buffers
        buffered = route.geom.buffer(buffer_dist / 111000.0)
        qs = Event.objects.filter(location__within=buffered)
        ser = self.get_serializer(qs, many=True)
        return Response(_as_feature_collection(ser.data))


class NeighborhoodViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Neighborhood.objects.all()
    serializer_class = NeighborhoodGeoSerializer


class RouteViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Route.objects.all()
    serializer_class = RouteGeoSerializer
