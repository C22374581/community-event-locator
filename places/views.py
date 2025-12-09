"""
Views for the Community Event Locator application.

This module contains view functions for rendering HTML pages including
the home page, map view, and trails listing.
"""
from django.shortcuts import render
from django.utils import timezone
from datetime import timedelta
from .models import Event, Route, Neighborhood, EventCategory


def home(request):
    """
    Home page view displaying statistics and featured content.
    
    Shows:
    - Total counts (events, routes, neighborhoods)
    - Featured upcoming events
    - Featured trails
    - Quick stats
    """
    stats = {
        "events": Event.objects.count(),
        "routes": Route.objects.count(),
        "neighborhoods": Neighborhood.objects.count(),
        "categories": EventCategory.objects.count(),
    }

    # Featured upcoming events (next 30 days)
    try:
        featured_events = Event.objects.filter(
            when__gte=timezone.now(),
            when__lte=timezone.now() + timedelta(days=30)
        )
        # Filter by status if field exists
        if hasattr(Event, 'status'):
            featured_events = featured_events.filter(status='active')
        try:
            featured_events = featured_events.select_related('category')
        except:
            pass
        featured_events = featured_events.order_by('when')[:6]
    except Exception as e:
        featured_events = Event.objects.none()

    # Featured trails (most popular or longest)
    try:
        # Use defer to exclude country field if table doesn't exist
        featured_trails = Route.objects.defer('country').order_by('?')[:6]
    except Exception:
        try:
            featured_trails = Route.objects.all().order_by('?')[:6]
        except Exception:
            featured_trails = Route.objects.none()

    # Events by category
    events_by_category = {}
    try:
        # Use only() to exclude parent field if it doesn't exist
        categories = EventCategory.objects.all()
        for category in categories:
            events_qs = Event.objects.filter(category=category)
            if hasattr(Event, 'status'):
                events_qs = events_qs.filter(status='active')
            count = events_qs.count()
            if count > 0:
                events_by_category[category] = count
    except Exception as e:
        # If categories don't exist yet or parent field missing, just skip
        pass

    # Get next major event for countdown
    next_major_event = None
    try:
        next_major_event = Event.objects.filter(
            when__gte=timezone.now()
        ).order_by('when').first()
    except:
        pass

    context = {
        'stats': stats,
        'featured_events': featured_events,
        'featured_trails': featured_trails,
        'events_by_category': events_by_category,
        'next_major_event': next_major_event,
    }
    return render(request, "home.html", context)


def map_view(request):
    """
    Interactive map view with all spatial features.
    
    Displays events, routes, and neighborhoods on an interactive Leaflet map
    with filtering and search capabilities.
    """
    return render(request, "map.html")


def trails_view(request):
    """
    Trails listing page showing all walking routes.
    
    Displays a list of all trails/walking routes with details,
    difficulty ratings, and links to view on map.
    """
    trails = Route.objects.all().order_by('name')
    
    # Group by difficulty
    trails_by_difficulty = {}
    if hasattr(Route, 'difficulty'):
        trails_by_difficulty = {
            'Easy': trails.filter(difficulty=1),
            'Moderate': trails.filter(difficulty=2),
            'Challenging': trails.filter(difficulty=3),
            'Hard': trails.filter(difficulty=4),
            'Extreme': trails.filter(difficulty=5),
        }
    else:
        trails_by_difficulty = {'All': trails}

    context = {
        'trails': trails,
        'trails_by_difficulty': trails_by_difficulty,
    }
    return render(request, "trails.html", context)


def events_view(request):
    """
    Events listing page showing all events.
    
    Displays a list of all events with filtering by category,
    status, and date range.
    """
    try:
        # First, try without select_related to see if basic query works
        events = Event.objects.all().order_by('-when')
        # Try to get count to verify data exists
        event_count = events.count()
        print(f"DEBUG: Found {event_count} events in database")
        
        # Safely select related fields - only if they exist
        try:
            # Try with all relations
            events = events.select_related('category', 'organizer', 'country')
        except Exception as e1:
            print(f"DEBUG: select_related with all failed: {e1}")
            try:
                # Try with just category
                events = Event.objects.all().order_by('-when').select_related('category')
            except Exception as e2:
                print(f"DEBUG: select_related with category failed: {e2}")
                # Just use basic query
                events = Event.objects.all().order_by('-when')
    except Exception as e:
        print(f"Error loading events: {e}")
        import traceback
        traceback.print_exc()
        events = Event.objects.none()
    
    # Filtering
    category_id = request.GET.get('category')
    if category_id:
        try:
            events = events.filter(category_id=category_id)
        except Exception:
            pass
    
    status = request.GET.get('status')
    if status:
        try:
            events = events.filter(status=status)
        except Exception:
            pass
    
    upcoming_only = request.GET.get('upcoming') == 'true'
    if upcoming_only:
        try:
            events = events.filter(when__gte=timezone.now())
        except Exception:
            pass

    try:
        categories = EventCategory.objects.all()
    except Exception:
        categories = []

    context = {
        'events': list(events[:100]),  # Limit for performance, convert to list
        'categories': categories,
        'selected_category': int(category_id) if category_id and category_id.isdigit() else None,
        'selected_status': status or 'all',
        'upcoming_only': upcoming_only,
    }
    return render(request, "events.html", context)
