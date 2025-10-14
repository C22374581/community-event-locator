from rest_framework_gis.serializers import GeoFeatureModelSerializer
from .models import Event, Route, Neighborhood

class EventGeoSerializer(GeoFeatureModelSerializer):
    class Meta:
        model = Event
        geo_field = 'location'
        fields = ('id', 'title', 'description', 'when', 'neighborhood')

class RouteGeoSerializer(GeoFeatureModelSerializer):
    class Meta:
        model = Route
        geo_field = 'path'
        fields = ('id', 'name')

class NeighborhoodGeoSerializer(GeoFeatureModelSerializer):
    class Meta:
        model = Neighborhood
        geo_field = 'area'
        fields = ('id', 'name')
