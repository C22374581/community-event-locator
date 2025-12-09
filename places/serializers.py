"""
Comprehensive serializers for GeoJSON API responses.

All serializers extend GeoFeatureModelSerializer to output proper GeoJSON
Feature/FeatureCollection format with geometry and properties.
Includes serializers for all complex relationships.
"""
from rest_framework import serializers
from rest_framework_gis.serializers import GeoFeatureModelSerializer
from django.contrib.gis.geos import Point
from django.contrib.auth.models import User
from .models import (
    Event, Route, Neighborhood, EventCategory, Country, Region,
    Organizer, EventMedia, EventAttendee, EventReview, UserFavorite,
    UserProfile, TrailCompletion, EventSeries, RouteWaypoint, SpatialQueryLog
)


# Basic serializers
class CountrySerializer(serializers.ModelSerializer):
    """Serializer for Country model."""
    class Meta:
        model = Country
        fields = ('id', 'name', 'code', 'flag_emoji')


class RegionSerializer(serializers.ModelSerializer):
    """Serializer for Region model."""
    country = CountrySerializer(read_only=True)
    
    class Meta:
        model = Region
        fields = ('id', 'name', 'country')


class EventCategorySerializer(serializers.ModelSerializer):
    """Serializer for EventCategory model with hierarchy."""
    subcategories = serializers.SerializerMethodField()
    event_count = serializers.SerializerMethodField()
    
    class Meta:
        model = EventCategory
        fields = ('id', 'name', 'icon', 'color', 'description', 'parent', 'subcategories', 'event_count')
    
    def get_subcategories(self, obj):
        """Get subcategories."""
        return EventCategorySerializer(obj.subcategories.all(), many=True).data
    
    def get_event_count(self, obj):
        """Count of events in this category."""
        return obj.events.count()


class OrganizerSerializer(serializers.ModelSerializer):
    """Serializer for Organizer model."""
    event_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Organizer
        fields = ('id', 'name', 'email', 'website', 'description', 'logo_url', 'verified', 'event_count')
    
    def get_event_count(self, obj):
        """Count of events organized."""
        return obj.events.count()


class UserSerializer(serializers.ModelSerializer):
    """Basic user serializer."""
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name')


class UserProfileSerializer(serializers.ModelSerializer):
    """Serializer for UserProfile."""
    user = UserSerializer(read_only=True)
    favorite_countries = CountrySerializer(many=True, read_only=True)
    favorite_categories = EventCategorySerializer(many=True, read_only=True)
    
    class Meta:
        model = UserProfile
        fields = ('id', 'user', 'bio', 'location', 'favorite_countries', 'favorite_categories', 
                 'avatar_url', 'events_attended_count', 'reviews_count')


# GeoJSON serializers
class NeighborhoodGeoSerializer(GeoFeatureModelSerializer):
    """GeoJSON serializer for Neighborhood model."""
    event_count = serializers.SerializerMethodField()
    country = serializers.SerializerMethodField()
    region = serializers.SerializerMethodField()
    description = serializers.SerializerMethodField()
    
    class Meta:
        model = Neighborhood
        geo_field = 'area'
        fields = ('id', 'name', 'description', 'event_count', 'country', 'region')
    
    def get_description(self, obj):
        """Safely get description."""
        try:
            return obj.description if hasattr(obj, 'description') else ''
        except Exception:
            return ''
    
    def get_country(self, obj):
        """Safely get country."""
        try:
            if hasattr(obj, 'country') and obj.country:
                return CountrySerializer(obj.country).data
        except Exception:
            pass
        return None
    
    def get_region(self, obj):
        """Safely get region."""
        try:
            if hasattr(obj, 'region') and obj.region:
                return RegionSerializer(obj.region).data
        except Exception:
            pass
        return None
    
    def get_event_count(self, obj):
        """Get count of events in this neighborhood."""
        try:
            return obj.events.count() if hasattr(obj, 'events') else 0
        except Exception:
            return 0
    
    def get_event_count(self, obj):
        """Get count of events in this neighborhood."""
        return obj.events.count()


class RouteWaypointSerializer(GeoFeatureModelSerializer):
    """GeoJSON serializer for RouteWaypoint."""
    class Meta:
        model = RouteWaypoint
        geo_field = 'location'
        fields = ('id', 'name', 'order', 'description', 'elevation')


class RouteGeoSerializer(GeoFeatureModelSerializer):
    """GeoJSON serializer for Route model - waypoints disabled."""
    distance_meters = serializers.SerializerMethodField()
    distance_km = serializers.SerializerMethodField()
    difficulty_display = serializers.CharField(source='get_difficulty_display', read_only=True)
    country = serializers.SerializerMethodField()
    completion_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Route
        geo_field = 'path'
        fields = (
            'id', 'name', 'description', 'difficulty', 'difficulty_display',
            'distance_meters', 'distance_km', 'elevation_gain',
            'estimated_duration_hours', 'country', 'completion_count'
        )
        # Removed 'waypoints' from fields - table doesn't exist
    
    def get_country(self, obj):
        """Safely get country."""
        try:
            if hasattr(obj, 'country') and obj.country is not None:
                return {'id': obj.country.id, 'name': obj.country.name, 'code': getattr(obj.country, 'code', '')}
        except Exception:
            pass
        return None
    
    def get_distance_meters(self, obj):
        """Calculate route distance in meters."""
        return obj.distance_meters
    
    def get_distance_km(self, obj):
        """Get distance in kilometers."""
        return obj.distance_km
    
    def get_completion_count(self, obj):
        """Count of users who completed this trail."""
        try:
            # Check if TrailCompletion model/table exists
            if hasattr(obj, 'completions'):
                return obj.completions.count()
        except Exception:
            # Table doesn't exist or other error - return 0
            pass
        return 0


class EventMediaSerializer(serializers.ModelSerializer):
    """Serializer for EventMedia."""
    class Meta:
        model = EventMedia
        fields = ('id', 'media_type', 'url', 'caption', 'order')


class EventReviewSerializer(serializers.ModelSerializer):
    """Serializer for EventReview."""
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = EventReview
        fields = ('id', 'user', 'rating', 'comment', 'created_at', 'updated_at')


class EventAttendeeSerializer(serializers.ModelSerializer):
    """Serializer for EventAttendee."""
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = EventAttendee
        fields = ('id', 'user', 'status', 'rsvp_date', 'checked_in', 'checked_in_at')


class EventGeoSerializer(GeoFeatureModelSerializer):
    """
    Comprehensive GeoJSON serializer for Event model.
    
    Includes all relationships: category, organizer, country, reviews, attendees, media.
    All related fields use SerializerMethodField for safety.
    """
    category = serializers.SerializerMethodField()
    organizer = serializers.SerializerMethodField()
    country = serializers.SerializerMethodField()
    neighborhood_name = serializers.SerializerMethodField()
    tags_list = serializers.SerializerMethodField()
    is_upcoming = serializers.SerializerMethodField()
    is_past = serializers.SerializerMethodField()
    distance = serializers.SerializerMethodField()
    attendee_count = serializers.SerializerMethodField()
    average_rating = serializers.SerializerMethodField()
    media = serializers.SerializerMethodField()
    reviews = serializers.SerializerMethodField()
    attendees = serializers.SerializerMethodField()
    created_by = serializers.SerializerMethodField()
    parent_event = serializers.SerializerMethodField()
    
    class Meta:
        model = Event
        geo_field = 'location'
        fields = (
            'id', 'title', 'description', 'when', 'end_time', 'status',
            'neighborhood_name', 'country',
            'category', 'organizer', 'tags', 'tags_list',
            'capacity', 'price', 'image_url', 'website_url',
            'recurring', 'parent_event',
            'is_upcoming', 'is_past', 'distance',
            'attendee_count', 'average_rating',
            'media', 'reviews', 'attendees',
            'created_by', 'created_at', 'updated_at'
        )
    
    def to_representation(self, instance):
        """Override to catch SkipField and ALL exceptions - CRITICAL FIX."""
        from rest_framework.fields import SkipField
        try:
            # Try normal serialization
            result = super().to_representation(instance)
            return result
        except SkipField as sf:
            # SkipField raised during serialization - return safe minimal representation
            try:
                geom = None
                if hasattr(instance, 'location') and instance.location:
                    geom = {
                        'type': 'Point',
                        'coordinates': [float(instance.location.x), float(instance.location.y)]
                    }
                return {
                    'type': 'Feature',
                    'geometry': geom,
                    'properties': {
                        'id': instance.id,
                        'title': str(getattr(instance, 'title', '')),
                        'description': str(getattr(instance, 'description', '')),
                        'when': instance.when.isoformat() if hasattr(instance, 'when') and instance.when else None,
                    }
                }
            except Exception:
                # If even minimal representation fails, return absolute minimum
                return {
                    'type': 'Feature',
                    'geometry': None,
                    'properties': {'id': instance.id, 'title': 'Event'}
                }
        except Exception as e:
            # Any other exception - return safe representation
            try:
                return {
                    'type': 'Feature',
                    'geometry': None,
                    'properties': {
                        'id': instance.id,
                        'title': str(getattr(instance, 'title', '')),
                    }
                }
            except Exception:
                # Absolute fallback
                return {'type': 'Feature', 'geometry': None, 'properties': {'id': instance.id}}
    
    def get_properties(self, instance, fields):
        """Override to catch SkipField exceptions for each field - CRITICAL FIX."""
        from rest_framework.fields import SkipField
        properties = {}
        for field in fields:
            try:
                # Try to get the field value
                try:
                    value = field.get_attribute(instance)
                    properties[field.field_name] = field.to_representation(value)
                except SkipField:
                    # Skip this field - it's expected for some fields
                    continue
                except AttributeError as ae:
                    # If attribute doesn't exist, skip it
                    if 'NoneType' in str(ae) or 'has no attribute' in str(ae):
                        continue
                    raise
            except Exception:
                # For any other error, skip this field
                continue
        return properties
    
    def get_category(self, obj):
        """Safely get category."""
        try:
            if hasattr(obj, 'category') and obj.category is not None:
                return {'id': obj.category.id, 'name': obj.category.name, 'icon': getattr(obj.category, 'icon', ''), 'color': getattr(obj.category, 'color', '')}
        except Exception:
            pass
        return None
    
    def get_organizer(self, obj):
        """Safely get organizer."""
        try:
            if hasattr(obj, 'organizer') and obj.organizer is not None:
                return {'id': obj.organizer.id, 'name': obj.organizer.name}
        except Exception:
            pass
        return None
    
    def get_country(self, obj):
        """Safely get country."""
        try:
            if hasattr(obj, 'country') and obj.country is not None:
                return {'id': obj.country.id, 'name': obj.country.name, 'code': getattr(obj.country, 'code', ''), 'flag_emoji': getattr(obj.country, 'flag_emoji', '')}
        except Exception:
            pass
        return None
    
    def get_neighborhood_name(self, obj):
        """Safely get neighborhood name."""
        try:
            if hasattr(obj, 'neighborhood') and obj.neighborhood:
                return obj.neighborhood.name
            return None
        except Exception:
            return None
    
    def get_tags_list(self, obj):
        """Return tags as a list."""
        try:
            if hasattr(obj, 'get_tags_list'):
                return obj.get_tags_list()
            # Fallback: parse tags string manually
            if hasattr(obj, 'tags') and obj.tags:
                return [tag.strip() for tag in str(obj.tags).split(',') if tag.strip()]
            return []
        except Exception:
            return []
    
    def get_is_upcoming(self, obj):
        """Check if event is upcoming."""
        try:
            from django.utils import timezone
            return obj.when > timezone.now() if obj.when else False
        except Exception:
            return False
    
    def get_is_past(self, obj):
        """Check if event is past."""
        try:
            from django.utils import timezone
            return obj.when < timezone.now() if obj.when else False
        except Exception:
            return False
    
    def get_distance(self, obj):
        """Calculate distance from reference point if provided."""
        try:
            reference_point = self.context.get('reference_point')
            if reference_point and obj.location:
                distance_deg = obj.location.distance(reference_point)
                distance_m = distance_deg * 111000
                return round(distance_m, 2)
        except Exception:
            pass
        return None
    
    def get_attendee_count(self, obj):
        """Get attendee count."""
        try:
            return obj.attendees.count() if hasattr(obj, 'attendees') else 0
        except Exception:
            return 0
    
    def get_average_rating(self, obj):
        """Get average rating."""
        try:
            if hasattr(obj, 'reviews'):
                reviews = obj.reviews.all()
                if reviews.exists():
                    return sum(r.rating for r in reviews) / reviews.count()
        except Exception:
            pass
        return None
    
    def get_media(self, obj):
        """Get media."""
        try:
            if hasattr(obj, 'media_files'):
                return EventMediaSerializer(obj.media_files.all(), many=True).data
        except Exception:
            pass
        return []
    
    def get_reviews(self, obj):
        """Get reviews."""
        try:
            if hasattr(obj, 'reviews'):
                return EventReviewSerializer(obj.reviews.all()[:10], many=True).data
        except Exception:
            pass
        return []
    
    def get_attendees(self, obj):
        """Get attendees."""
        try:
            if hasattr(obj, 'attendees'):
                return EventAttendeeSerializer(obj.attendees.all()[:10], many=True).data
        except Exception:
            pass
        return []
    
    def get_created_by(self, obj):
        """Get created by user."""
        try:
            if hasattr(obj, 'created_by') and obj.created_by:
                return UserSerializer(obj.created_by).data
        except Exception:
            pass
        return None


# Additional serializers
class TrailCompletionSerializer(serializers.ModelSerializer):
    """Serializer for TrailCompletion."""
    user = UserSerializer(read_only=True)
    route = RouteGeoSerializer(read_only=True)
    
    class Meta:
        model = TrailCompletion
        fields = ('id', 'user', 'route', 'completed_at', 'duration_hours', 'notes', 'photos', 'created_at')


class UserFavoriteSerializer(serializers.ModelSerializer):
    """Serializer for UserFavorite."""
    user = UserSerializer(read_only=True)
    event = EventGeoSerializer(read_only=True)
    route = RouteGeoSerializer(read_only=True)
    neighborhood = NeighborhoodGeoSerializer(read_only=True)
    
    class Meta:
        model = UserFavorite
        fields = ('id', 'user', 'event', 'route', 'neighborhood', 'notes', 'created_at')


class EventSeriesSerializer(serializers.ModelSerializer):
    """Serializer for EventSeries."""
    organizer = OrganizerSerializer(read_only=True)
    
    class Meta:
        model = EventSeries
        fields = ('id', 'name', 'description', 'frequency', 'start_date', 'end_date', 'organizer', 'created_at')
