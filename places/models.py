"""
Django models for World Walking Events platform.

This module defines a comprehensive spatial data model with complex relationships
for events, routes, neighborhoods, users, and social features.
All models use PostGIS geometry fields for spatial operations.
"""
from django.contrib.gis.db import models
from django.contrib.postgres.indexes import GistIndex
from django.contrib.auth.models import User
from django.core.validators import MinLengthValidator, MaxLengthValidator, MinValueValidator, MaxValueValidator
from django.utils import timezone
from django.urls import reverse


class Country(models.Model):
    """
    Represents a country for global event organization.
    
    Attributes:
        name: Country name
        code: ISO country code (e.g., 'IE', 'US', 'GB')
        geometry: Country boundary polygon (optional, for visualization)
    """
    name = models.CharField(max_length=100, unique=True, help_text="Country name")
    code = models.CharField(max_length=2, unique=True, help_text="ISO 3166-1 alpha-2 country code")
    geometry = models.MultiPolygonField(srid=4326, null=True, blank=True, help_text="Country boundary")
    flag_emoji = models.CharField(max_length=10, blank=True, help_text="Flag emoji for display")
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)

    class Meta:
        verbose_name_plural = "countries"
        ordering = ['name']
        indexes = [
            GistIndex(fields=['geometry']),
        ]

    def __str__(self):
        return self.name


class Region(models.Model):
    """
    Represents a region/state within a country.
    
    Attributes:
        name: Region name
        country: Foreign key to Country
        geometry: Region boundary polygon
    """
    name = models.CharField(max_length=120, help_text="Region/state name")
    country = models.ForeignKey(Country, on_delete=models.CASCADE, related_name='regions', help_text="Country")
    geometry = models.MultiPolygonField(srid=4326, null=True, blank=True, help_text="Region boundary")
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)

    class Meta:
        unique_together = ['name', 'country']
        indexes = [GistIndex(fields=['geometry'])]
        ordering = ['country', 'name']

    def __str__(self):
        return f"{self.name}, {self.country.name}"


class Neighborhood(models.Model):
    """
    Represents a neighborhood area as a polygon.
    
    Enhanced with region and country relationships for global organization.
    
    Attributes:
        name: Name of the neighborhood
        area: Polygon geometry defining the neighborhood boundaries (SRID 4326)
        region: Optional region reference
        country: Optional country reference
        description: Detailed description
    """
    name = models.CharField(max_length=120, help_text="Name of the neighborhood")
    area = models.PolygonField(srid=4326, help_text="Polygon geometry of neighborhood boundaries")
    region = models.ForeignKey(Region, null=True, blank=True, on_delete=models.SET_NULL, related_name='neighborhoods')
    country = models.ForeignKey(Country, null=True, blank=True, on_delete=models.SET_NULL, related_name='neighborhoods')
    description = models.TextField(blank=True, help_text="Neighborhood description")
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)

    class Meta:
        indexes = [GistIndex(fields=['area'])]
        verbose_name_plural = "neighborhoods"
        ordering = ['name']

    def __str__(self):
        return self.name

    @property
    def event_count(self):
        """Count of events in this neighborhood."""
        return self.events.count()


class EventCategory(models.Model):
    """
    Category for organizing events (e.g., Music, Sports, Food).
    
    Attributes:
        name: Category name
        icon: Icon identifier for map markers
        color: Hex color code for category styling
        parent: Optional parent category for hierarchical organization
    """
    name = models.CharField(max_length=50, unique=True, help_text="Category name")
    icon = models.CharField(
        max_length=20, default="pin",
        help_text="Icon identifier for map markers"
    )
    color = models.CharField(
        max_length=7, default="#20c997",
        help_text="Hex color code for category styling"
    )
    description = models.TextField(blank=True, help_text="Category description")
    parent = models.ForeignKey(
        'self', null=True, blank=True, on_delete=models.SET_NULL,
        related_name='subcategories', help_text="Parent category for hierarchy"
    )
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)

    class Meta:
        verbose_name_plural = "event categories"
        ordering = ['name']

    def __str__(self):
        return self.name

    def get_all_subcategories(self):
        """Get all subcategories recursively."""
        subcategories = list(self.subcategories.all())
        for subcat in self.subcategories.all():
            subcategories.extend(subcat.get_all_subcategories())
        return subcategories


class Organizer(models.Model):
    """
    Represents an event organizer or organization.
    
    Attributes:
        name: Organizer name
        user: Optional link to user account
        email: Contact email
        website: Organizer website
        description: About the organizer
        logo_url: URL to organizer logo
    """
    name = models.CharField(max_length=200, help_text="Organizer name")
    user = models.OneToOneField(
        User, null=True, blank=True, on_delete=models.SET_NULL,
        related_name='organizer_profile', help_text="Linked user account"
    )
    email = models.EmailField(blank=True, help_text="Contact email")
    website = models.URLField(blank=True, help_text="Organizer website")
    description = models.TextField(blank=True, help_text="About the organizer")
    logo_url = models.URLField(blank=True, help_text="URL to organizer logo")
    verified = models.BooleanField(default=False, help_text="Verified organizer status")
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name

    @property
    def event_count(self):
        """Count of events organized by this organizer."""
        return self.events.count()


class Route(models.Model):
    """
    Represents a walking route as a LineString.
    
    Enhanced with waypoints, segments, and difficulty ratings.
    
    Attributes:
        name: Name of the route
        path: LineString geometry representing the route path (SRID 4326)
        difficulty: Optional difficulty rating (1-5)
        distance_meters: Calculated distance in meters
        country: Country where route is located
        description: Detailed route description
        elevation_gain: Elevation gain in meters
        estimated_duration_hours: Estimated walking time
    """
    name = models.CharField(max_length=120, help_text="Name of the route")
    path = models.LineStringField(srid=4326, help_text="LineString geometry of the route")
    difficulty = models.IntegerField(
        null=True, blank=True,
        choices=[(1, 'Easy'), (2, 'Moderate'), (3, 'Challenging'), (4, 'Hard'), (5, 'Extreme')],
        help_text="Difficulty rating from 1 (Easy) to 5 (Extreme)"
    )
    description = models.TextField(blank=True, help_text="Description of the route")
    country = models.ForeignKey(Country, null=True, blank=True, on_delete=models.SET_NULL, related_name='routes')
    elevation_gain = models.IntegerField(null=True, blank=True, help_text="Elevation gain in meters")
    estimated_duration_hours = models.FloatField(
        null=True, blank=True,
        validators=[MinValueValidator(0.1), MaxValueValidator(1000)],
        help_text="Estimated duration in hours"
    )
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [GistIndex(fields=['path'])]
        ordering = ['name']

    def __str__(self):
        return self.name

    @property
    def distance_meters(self):
        """Calculate route distance in meters using PostGIS."""
        if self.path:
            # Approximate conversion (degrees to meters at equator)
            return round(self.path.length * 111000, 2)
        return None

    @property
    def distance_km(self):
        """Get distance in kilometers."""
        dist = self.distance_meters
        return round(dist / 1000, 2) if dist else None

    def get_absolute_url(self):
        """Get URL for route detail page."""
        return reverse('map') + f'?trail={self.id}'


class RouteWaypoint(models.Model):
    """
    Waypoints along a route for detailed navigation.
    
    Attributes:
        route: Foreign key to Route
        name: Waypoint name
        location: Point geometry of waypoint
        order: Order along the route
        description: Waypoint description
    """
    route = models.ForeignKey(Route, on_delete=models.CASCADE, related_name='waypoints')
    name = models.CharField(max_length=100)
    location = models.PointField(srid=4326, help_text="Waypoint location")
    order = models.IntegerField(help_text="Order along the route (1, 2, 3...)")
    description = models.TextField(blank=True, help_text="Waypoint description")
    elevation = models.IntegerField(null=True, blank=True, help_text="Elevation in meters")

    class Meta:
        indexes = [GistIndex(fields=['location'])]
        unique_together = ['route', 'order']
        ordering = ['route', 'order']

    def __str__(self):
        return f"{self.route.name} - Waypoint {self.order}: {self.name}"


class Event(models.Model):
    """
    Represents an event at a specific location.
    
    Comprehensive event model with organizers, attendees, reviews, and media.
    
    Attributes:
        title: Event title
        description: Detailed event description
        when: Event date and time
        location: Point geometry of event location (SRID 4326)
        neighborhood: Optional reference to containing neighborhood
        category: Event category
        organizer: Event organizer
        tags: Comma-separated tags
        status: Event status
        capacity: Maximum attendees
        price: Event price (0 for free)
        country: Country where event is located
        image_url: Optional URL to event image
        website_url: Optional URL to event website
        recurring: Whether event is part of a series
        parent_event: For recurring events, link to parent
    """
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('active', 'Active'),
        ('cancelled', 'Cancelled'),
        ('postponed', 'Postponed'),
        ('completed', 'Completed'),
    ]

    title = models.CharField(
        max_length=140,
        validators=[MinLengthValidator(3)],
        help_text="Event title (3-140 characters)"
    )
    description = models.TextField(blank=True, help_text="Detailed event description")
    when = models.DateTimeField(help_text="Event date and time")
    end_time = models.DateTimeField(null=True, blank=True, help_text="Event end time")
    location = models.PointField(srid=4326, help_text="Point geometry of event location")
    neighborhood = models.ForeignKey(
        Neighborhood, null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='events',
        help_text="Neighborhood containing this event"
    )
    country = models.ForeignKey(Country, null=True, blank=True, on_delete=models.SET_NULL, related_name='events')
    category = models.ForeignKey(
        EventCategory, null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='events',
        help_text="Event category"
    )
    organizer = models.ForeignKey(
        Organizer, null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='events',
        help_text="Event organizer"
    )
    tags = models.CharField(
        max_length=200, blank=True,
        help_text="Comma-separated tags (e.g., 'music,outdoor,family-friendly')"
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='draft',
        help_text="Current status of the event"
    )
    capacity = models.IntegerField(
        null=True, blank=True,
        validators=[MinValueValidator(1)],
        help_text="Maximum number of attendees"
    )
    price = models.DecimalField(
        max_digits=10, decimal_places=2, default=0.00,
        help_text="Event price (0.00 for free events)"
    )
    image_url = models.URLField(blank=True, help_text="URL to event image")
    website_url = models.URLField(blank=True, help_text="URL to event website")
    recurring = models.BooleanField(default=False, help_text="Is this a recurring event?")
    parent_event = models.ForeignKey(
        'self', null=True, blank=True,
        on_delete=models.CASCADE,
        related_name='recurring_instances',
        help_text="Parent event for recurring series"
    )
    created_by = models.ForeignKey(
        User, null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='created_events',
        help_text="User who created this event"
    )
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True, help_text="When event was created")
    updated_at = models.DateTimeField(auto_now=True, help_text="When event was last updated")

    class Meta:
        indexes = [
            GistIndex(fields=['location']),
            models.Index(fields=['when']),
            models.Index(fields=['status']),
            models.Index(fields=['category']),
            models.Index(fields=['country']),
            models.Index(fields=['organizer']),
        ]
        ordering = ['-when']
        get_latest_by = 'when'

    def __str__(self):
        return self.title

    def get_tags_list(self):
        """Return tags as a list."""
        return [tag.strip() for tag in self.tags.split(',') if tag.strip()] if self.tags else []

    @property
    def is_upcoming(self):
        """Check if event is in the future."""
        return self.when > timezone.now()

    @property
    def is_past(self):
        """Check if event has passed."""
        return self.when < timezone.now()

    @property
    def attendee_count(self):
        """Count of users attending this event."""
        return self.attendees.filter(status='going').count()

    @property
    def average_rating(self):
        """Calculate average rating from reviews."""
        reviews = self.reviews.filter(rating__isnull=False)
        if reviews.exists():
            return round(reviews.aggregate(models.Avg('rating'))['rating__avg'], 2)
        return None

    def get_absolute_url(self):
        """Get URL for event detail page."""
        return reverse('map') + f'?event={self.id}'


class EventMedia(models.Model):
    """
    Media files (images, videos) associated with events.
    
    Attributes:
        event: Foreign key to Event
        media_type: Type of media (image, video)
        url: URL to media file
        caption: Media caption
        order: Display order
    """
    MEDIA_TYPES = [
        ('image', 'Image'),
        ('video', 'Video'),
    ]

    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='media')
    media_type = models.CharField(max_length=10, choices=MEDIA_TYPES, default='image')
    url = models.URLField(help_text="URL to media file")
    caption = models.CharField(max_length=200, blank=True, help_text="Media caption")
    order = models.IntegerField(default=0, help_text="Display order")
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)

    class Meta:
        ordering = ['event', 'order', 'created_at']
        verbose_name_plural = "event media"

    def __str__(self):
        return f"{self.event.title} - {self.get_media_type_display()} {self.order}"


class EventAttendee(models.Model):
    """
    Many-to-many relationship between Users and Events with status.
    
    Tracks user attendance/interaction with events.
    
    Attributes:
        user: User attending
        event: Event being attended
        status: Attendance status (going, interested, not_going)
        rsvp_date: When user RSVP'd
        notes: User notes about the event
    """
    STATUS_CHOICES = [
        ('going', 'Going'),
        ('interested', 'Interested'),
        ('not_going', 'Not Going'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='event_attendances')
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='attendees')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='interested')
    rsvp_date = models.DateTimeField(auto_now_add=True, help_text="When user RSVP'd")
    notes = models.TextField(blank=True, help_text="User notes about this event")
    checked_in = models.BooleanField(default=False, help_text="User checked in at event")
    checked_in_at = models.DateTimeField(null=True, blank=True, help_text="Check-in timestamp")

    class Meta:
        unique_together = ['user', 'event']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['event', 'status']),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.event.title} ({self.status})"


class EventReview(models.Model):
    """
    User reviews and ratings for events.
    
    Attributes:
        user: User who wrote the review
        event: Event being reviewed
        rating: Rating from 1 to 5
        comment: Review text
        created_at: When review was created
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='event_reviews')
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='reviews')
    rating = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="Rating from 1 to 5"
    )
    comment = models.TextField(blank=True, help_text="Review comment")
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['user', 'event']
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} - {self.event.title} ({self.rating}/5)"


class UserFavorite(models.Model):
    """
    User favorites/bookmarks for events, routes, and neighborhoods.
    
    Attributes:
        user: User who favorited
        content_type: Type of content (event, route, neighborhood)
        object_id: ID of favorited object
        created_at: When favorited
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='favorites')
    event = models.ForeignKey(
        Event, null=True, blank=True,
        on_delete=models.CASCADE,
        related_name='favorited_by'
    )
    route = models.ForeignKey(
        Route, null=True, blank=True,
        on_delete=models.CASCADE,
        related_name='favorited_by'
    )
    neighborhood = models.ForeignKey(
        Neighborhood, null=True, blank=True,
        on_delete=models.CASCADE,
        related_name='favorited_by'
    )
    notes = models.TextField(blank=True, help_text="User notes about this favorite")
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)

    class Meta:
        indexes = [models.Index(fields=['user', 'created_at'])]
        # Ensure only one type is set
        constraints = [
            models.CheckConstraint(
                check=(
                    models.Q(event__isnull=False) & models.Q(route__isnull=True) & models.Q(neighborhood__isnull=True) |
                    models.Q(event__isnull=True) & models.Q(route__isnull=False) & models.Q(neighborhood__isnull=True) |
                    models.Q(event__isnull=True) & models.Q(route__isnull=True) & models.Q(neighborhood__isnull=False)
                ),
                name='one_content_type_only'
            )
        ]

    def __str__(self):
        if self.event:
            return f"{self.user.username} favorited {self.event.title}"
        elif self.route:
            return f"{self.user.username} favorited {self.route.name}"
        elif self.neighborhood:
            return f"{self.user.username} favorited {self.neighborhood.name}"
        return f"{self.user.username} favorite"


class UserProfile(models.Model):
    """
    Extended user profile with location preferences and activity.
    
    Attributes:
        user: One-to-one link to User
        bio: User biography
        location: User's default location
        favorite_countries: Many-to-many countries user is interested in
        favorite_categories: Many-to-many event categories user likes
        avatar_url: URL to user avatar
        created_at: Profile creation date
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    bio = models.TextField(blank=True, help_text="User biography")
    location = models.PointField(srid=4326, null=True, blank=True, help_text="User's default location")
    favorite_countries = models.ManyToManyField(Country, blank=True, related_name='users_interested')
    favorite_categories = models.ManyToManyField(EventCategory, blank=True, related_name='users_interested')
    avatar_url = models.URLField(blank=True, help_text="URL to user avatar")
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [GistIndex(fields=['location'])]

    def __str__(self):
        return f"{self.user.username}'s Profile"

    @property
    def events_attended_count(self):
        """Count of events user has attended."""
        return self.user.event_attendances.filter(status='going').count()

    @property
    def reviews_count(self):
        """Count of reviews user has written."""
        return self.user.event_reviews.count()


class TrailCompletion(models.Model):
    """
    Tracks user completions of trails/routes.
    
    Attributes:
        user: User who completed the trail
        route: Trail that was completed
        completed_at: When trail was completed
        duration_hours: Actual time taken
        notes: User notes about the completion
        photos: URLs to completion photos
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='trail_completions')
    route = models.ForeignKey(Route, on_delete=models.CASCADE, related_name='completions')
    completed_at = models.DateTimeField(help_text="When trail was completed")
    duration_hours = models.FloatField(
        null=True, blank=True,
        validators=[MinValueValidator(0.1)],
        help_text="Actual duration in hours"
    )
    notes = models.TextField(blank=True, help_text="User notes about the completion")
    photos = models.JSONField(default=list, blank=True, help_text="URLs to completion photos")
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)

    class Meta:
        unique_together = ['user', 'route']
        ordering = ['-completed_at']

    def __str__(self):
        return f"{self.user.username} completed {self.route.name}"


class EventSeries(models.Model):
    """
    Represents a series of recurring events.
    
    Attributes:
        name: Series name
        description: Series description
        frequency: How often events occur
        start_date: When series starts
        end_date: When series ends (optional)
        organizer: Series organizer
    """
    FREQUENCY_CHOICES = [
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly'),
        ('yearly', 'Yearly'),
        ('custom', 'Custom'),
    ]

    name = models.CharField(max_length=200, help_text="Series name")
    description = models.TextField(blank=True, help_text="Series description")
    frequency = models.CharField(max_length=20, choices=FREQUENCY_CHOICES, default='weekly')
    start_date = models.DateTimeField(help_text="Series start date")
    end_date = models.DateTimeField(null=True, blank=True, help_text="Series end date (optional)")
    organizer = models.ForeignKey(Organizer, null=True, blank=True, on_delete=models.SET_NULL, related_name='event_series')
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)

    class Meta:
        verbose_name_plural = "event series"
        ordering = ['-start_date']

    def __str__(self):
        return self.name


class SpatialQueryLog(models.Model):
    """
    Logs spatial queries for analytics and optimization.
    
    Tracks what spatial queries users are performing.
    
    Attributes:
        query_type: Type of query (nearby, polygon, route, etc.)
        parameters: JSON field with query parameters
        result_count: Number of results returned
        execution_time_ms: Query execution time
        user: User who performed query (if authenticated)
        created_at: When query was performed
    """
    QUERY_TYPES = [
        ('nearby', 'Nearby Events'),
        ('polygon', 'Polygon Search'),
        ('route', 'Route Search'),
        ('neighborhood', 'Neighborhood Search'),
        ('bbox', 'Bounding Box'),
        ('distance_ranked', 'Distance Ranked'),
    ]

    query_type = models.CharField(max_length=50, choices=QUERY_TYPES)
    parameters = models.JSONField(default=dict, help_text="Query parameters")
    result_count = models.IntegerField(default=0, help_text="Number of results")
    execution_time_ms = models.FloatField(null=True, blank=True, help_text="Execution time in milliseconds")
    user = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='spatial_queries')
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=['query_type', 'created_at']),
            models.Index(fields=['user', 'created_at']),
        ]
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.query_type} query at {self.created_at}"
