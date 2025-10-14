from rest_framework import viewsets
from .models import Event, Route, Neighborhood
from .serializers import EventGeoSerializer, RouteGeoSerializer, NeighborhoodGeoSerializer


class EventViewSet(viewsets.ModelViewSet):
    queryset = Event.objects.all().order_by('id')
    serializer_class = EventGeoSerializer


class RouteViewSet(viewsets.ModelViewSet):
    queryset = Route.objects.all().order_by('id')
    serializer_class = RouteGeoSerializer


class NeighborhoodViewSet(viewsets.ModelViewSet):
    queryset = Neighborhood.objects.all().order_by('id')
    serializer_class = NeighborhoodGeoSerializer
