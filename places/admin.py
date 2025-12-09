"""
Comprehensive Django Admin configuration with map widgets and advanced filtering.

All spatial models use GISModelAdmin which provides interactive map widgets for
editing geometry fields using OpenLayers.
"""
from django.contrib import admin
from django.contrib.gis.admin import GISModelAdmin
from django.utils.html import format_html
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User
from .models import (
    Country, Region, Neighborhood, EventCategory, Organizer,
    Route, RouteWaypoint, Event, EventMedia, EventAttendee,
    EventReview, UserFavorite, UserProfile, TrailCompletion,
    EventSeries, SpatialQueryLog
)

# Web Mercator (EPSG:3857) coords for world view
WORLD_LON_3857 = 0
WORLD_LAT_3857 = 0


# Inline admins
class RegionInline(admin.TabularInline):
    """Inline admin for regions within countries."""
    model = Region
    extra = 0


class NeighborhoodInline(admin.TabularInline):
    """Inline admin for neighborhoods within regions."""
    model = Neighborhood
    extra = 0
    fields = ('name', 'description')


class RouteWaypointInline(admin.TabularInline):
    """Inline admin for waypoints within routes."""
    model = RouteWaypoint
    extra = 0
    fields = ('name', 'order', 'location', 'elevation', 'description')


class EventMediaInline(admin.TabularInline):
    """Inline admin for media within events."""
    model = EventMedia
    extra = 0
    fields = ('media_type', 'url', 'caption', 'order')


class EventAttendeeInline(admin.TabularInline):
    """Inline admin for attendees within events."""
    model = EventAttendee
    extra = 0
    fields = ('user', 'status', 'rsvp_date', 'checked_in')
    readonly_fields = ('rsvp_date',)


class EventReviewInline(admin.TabularInline):
    """Inline admin for reviews within events."""
    model = EventReview
    extra = 0
    fields = ('user', 'rating', 'comment', 'created_at')
    readonly_fields = ('created_at',)


# Main admins
@admin.register(Country)
class CountryAdmin(GISModelAdmin):
    """Admin for Country model."""
    list_display = ('name', 'code', 'flag_emoji', 'region_count', 'event_count')
    search_fields = ('name', 'code')
    inlines = [RegionInline]
    default_lon = WORLD_LON_3857
    default_lat = WORLD_LAT_3857
    default_zoom = 2
    
    def region_count(self, obj):
        return obj.regions.count()
    region_count.short_description = 'Regions'
    
    def event_count(self, obj):
        return obj.events.count()
    event_count.short_description = 'Events'


@admin.register(Region)
class RegionAdmin(GISModelAdmin):
    """Admin for Region model."""
    list_display = ('name', 'country', 'neighborhood_count')
    list_filter = ('country',)
    search_fields = ('name',)
    inlines = [NeighborhoodInline]
    default_lon = WORLD_LON_3857
    default_lat = WORLD_LAT_3857
    default_zoom = 4
    
    def neighborhood_count(self, obj):
        return obj.neighborhoods.count()
    neighborhood_count.short_description = 'Neighborhoods'


@admin.register(EventCategory)
class EventCategoryAdmin(admin.ModelAdmin):
    """Admin for EventCategory model with hierarchy."""
    list_display = ('name', 'icon', 'color_display', 'parent', 'event_count', 'subcategory_count')
    list_filter = ('parent',)
    search_fields = ('name', 'description')
    readonly_fields = ('event_count', 'subcategory_count')
    
    def color_display(self, obj):
        return format_html(
            '<span style="background-color: {}; padding: 5px 15px; border-radius: 3px; color: white;">{}</span>',
            obj.color, obj.color
        )
    color_display.short_description = 'Color'
    
    def event_count(self, obj):
        return obj.events.count()
    event_count.short_description = 'Events'
    
    def subcategory_count(self, obj):
        return obj.subcategories.count()
    subcategory_count.short_description = 'Subcategories'


@admin.register(Organizer)
class OrganizerAdmin(admin.ModelAdmin):
    """Admin for Organizer model."""
    list_display = ('name', 'user', 'email', 'verified', 'event_count')
    list_filter = ('verified',)
    search_fields = ('name', 'email', 'description')
    readonly_fields = ('event_count', 'created_at')
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'user', 'email', 'website', 'description')
        }),
        ('Media', {
            'fields': ('logo_url',)
        }),
        ('Status', {
            'fields': ('verified',)
        }),
        ('Metadata', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )
    
    def event_count(self, obj):
        return obj.events.count()
    event_count.short_description = 'Events'


@admin.register(Neighborhood)
class NeighborhoodAdmin(GISModelAdmin):
    """Admin for Neighborhood model with map widget."""
    list_display = ("name", "region", "country", "event_count")
    list_filter = ("country", "region")
    search_fields = ("name", "description")
    default_lon = WORLD_LON_3857
    default_lat = WORLD_LAT_3857
    default_zoom = 6
    
    def event_count(self, obj):
        return obj.events.count()
    event_count.short_description = 'Events'


@admin.register(Route)
class RouteAdmin(GISModelAdmin):
    """Admin for Route model with waypoints."""
    list_display = ("name", "difficulty", "country", "distance_display", "completion_count")
    list_filter = ("difficulty", "country")
    search_fields = ("name", "description")
    inlines = [RouteWaypointInline]
    default_lon = WORLD_LON_3857
    default_lat = WORLD_LAT_3857
    default_zoom = 6
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'description', 'difficulty', 'country')
        }),
        ('Route Details', {
            'fields': ('elevation_gain', 'estimated_duration_hours')
        }),
        ('Route Geometry', {
            'fields': ('path',),
            'description': 'Draw or edit the route path on the map below.'
        }),
    )
    
    def distance_display(self, obj):
        dist = obj.distance_km
        if dist:
            return f"{dist:.2f} km"
        return "—"
    distance_display.short_description = 'Distance'
    
    def completion_count(self, obj):
        return obj.completions.count()
    completion_count.short_description = 'Completions'


@admin.register(RouteWaypoint)
class RouteWaypointAdmin(GISModelAdmin):
    """Admin for RouteWaypoint model."""
    list_display = ('route', 'name', 'order', 'elevation')
    list_filter = ('route',)
    search_fields = ('name', 'description')
    default_lon = WORLD_LON_3857
    default_lat = WORLD_LAT_3857
    default_zoom = 10


@admin.register(Event)
class EventAdmin(GISModelAdmin):
    """Enhanced Admin for Event model with all relationships."""
    list_display = ("title", "category", "organizer", "status", "when", "country", "attendee_count", "average_rating_display")
    list_filter = ("status", "category", "organizer", "country", "when", "recurring")
    search_fields = ("title", "description", "tags")
    readonly_fields = ("created_at", "updated_at", "attendee_count", "average_rating_display", "is_upcoming_display")
    date_hierarchy = "when"
    inlines = [EventMediaInline, EventAttendeeInline, EventReviewInline]
    default_lon = WORLD_LON_3857
    default_lat = WORLD_LAT_3857
    default_zoom = 6
    
    fieldsets = (
        ('Event Information', {
            'fields': ('title', 'description', 'when', 'end_time', 'status', 'category', 'tags')
        }),
        ('Organization', {
            'fields': ('organizer', 'created_by', 'recurring', 'parent_event')
        }),
        ('Location', {
            'fields': ('location', 'neighborhood', 'country'),
            'description': 'Set the event location on the map below.'
        }),
        ('Event Details', {
            'fields': ('capacity', 'price')
        }),
        ('Links & Media', {
            'fields': ('image_url', 'website_url'),
            'classes': ('collapse',)
        }),
        ('Statistics', {
            'fields': ('attendee_count', 'average_rating_display', 'is_upcoming_display'),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def attendee_count(self, obj):
        return obj.attendee_count
    attendee_count.short_description = 'Attendees'
    
    def average_rating_display(self, obj):
        rating = obj.average_rating
        if rating:
            return format_html('<span style="color: #f59e0b;">★ {:.1f}/5</span>', rating)
        return "No ratings"
    average_rating_display.short_description = 'Rating'
    
    def is_upcoming_display(self, obj):
        if obj.is_upcoming:
            return format_html('<span style="color: green;">✓ Upcoming</span>')
        return format_html('<span style="color: gray;">Past</span>')
    is_upcoming_display.short_description = 'Status'
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('category', 'organizer', 'country', 'neighborhood', 'created_by')


@admin.register(EventMedia)
class EventMediaAdmin(admin.ModelAdmin):
    """Admin for EventMedia model."""
    list_display = ('event', 'media_type', 'order', 'caption_preview')
    list_filter = ('media_type',)
    search_fields = ('event__title', 'caption')
    
    def caption_preview(self, obj):
        return obj.caption[:50] + "..." if len(obj.caption) > 50 else obj.caption
    caption_preview.short_description = 'Caption'


@admin.register(EventAttendee)
class EventAttendeeAdmin(admin.ModelAdmin):
    """Admin for EventAttendee model."""
    list_display = ('user', 'event', 'status', 'rsvp_date', 'checked_in')
    list_filter = ('status', 'checked_in', 'rsvp_date')
    search_fields = ('user__username', 'event__title')
    readonly_fields = ('rsvp_date',)


@admin.register(EventReview)
class EventReviewAdmin(admin.ModelAdmin):
    """Admin for EventReview model."""
    list_display = ('user', 'event', 'rating', 'created_at')
    list_filter = ('rating', 'created_at')
    search_fields = ('user__username', 'event__title', 'comment')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(UserFavorite)
class UserFavoriteAdmin(admin.ModelAdmin):
    """Admin for UserFavorite model."""
    list_display = ('user', 'content_type_display', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('user__username', 'event__title', 'route__name', 'neighborhood__name')
    readonly_fields = ('created_at',)
    
    def content_type_display(self, obj):
        if obj.event:
            return f"Event: {obj.event.title}"
        elif obj.route:
            return f"Route: {obj.route.name}"
        elif obj.neighborhood:
            return f"Neighborhood: {obj.neighborhood.name}"
        return "Unknown"
    content_type_display.short_description = 'Content'


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    """Admin for UserProfile model."""
    list_display = ('user', 'bio_preview', 'events_attended_count', 'reviews_count')
    search_fields = ('user__username', 'bio')
    filter_horizontal = ('favorite_countries', 'favorite_categories')
    
    fieldsets = (
        ('User', {
            'fields': ('user',)
        }),
        ('Profile Information', {
            'fields': ('bio', 'avatar_url', 'location')
        }),
        ('Preferences', {
            'fields': ('favorite_countries', 'favorite_categories')
        }),
    )
    
    def bio_preview(self, obj):
        return obj.bio[:50] + "..." if len(obj.bio) > 50 else obj.bio
    bio_preview.short_description = 'Bio'
    
    def events_attended_count(self, obj):
        return obj.events_attended_count
    events_attended_count.short_description = 'Events Attended'
    
    def reviews_count(self, obj):
        return obj.reviews_count
    reviews_count.short_description = 'Reviews'


@admin.register(TrailCompletion)
class TrailCompletionAdmin(admin.ModelAdmin):
    """Admin for TrailCompletion model."""
    list_display = ('user', 'route', 'completed_at', 'duration_hours')
    list_filter = ('completed_at', 'route')
    search_fields = ('user__username', 'route__name', 'notes')
    readonly_fields = ('created_at',)


@admin.register(EventSeries)
class EventSeriesAdmin(admin.ModelAdmin):
    """Admin for EventSeries model."""
    list_display = ('name', 'organizer', 'frequency', 'start_date', 'end_date')
    list_filter = ('frequency', 'organizer')
    search_fields = ('name', 'description')
    readonly_fields = ('created_at',)


@admin.register(SpatialQueryLog)
class SpatialQueryLogAdmin(admin.ModelAdmin):
    """Admin for SpatialQueryLog model."""
    list_display = ('query_type', 'user', 'result_count', 'execution_time_ms', 'created_at')
    list_filter = ('query_type', 'created_at')
    search_fields = ('user__username',)
    readonly_fields = ('created_at',)
    date_hierarchy = 'created_at'
    
    def has_add_permission(self, request):
        return False  # Logs are auto-generated


# Extend User admin
class UserProfileInline(admin.StackedInline):
    """Inline admin for user profile."""
    model = UserProfile
    can_delete = False
    verbose_name_plural = 'Profile'


class CustomUserAdmin(BaseUserAdmin):
    """Extended user admin with profile."""
    inlines = (UserProfileInline,)


# Re-register User admin
admin.site.unregister(User)
admin.site.register(User, CustomUserAdmin)
